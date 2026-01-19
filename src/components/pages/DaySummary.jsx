import React, { useMemo, useState } from "react";
import { useBodega } from "../../store/BodegaContext";

/**
 * Formato moneda: Paraguay (Guaraní).
 */
const money = (value, currency = "PYG", locale = "es-PY") => {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
};

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso ?? "";
  }
}

function downloadCSV(filename, rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function printTicket(d) {
  // Ajustado para incluir tarjeta en el ticket impreso
  const byPay = d.byPayment || { efectivo: 0, transferencia: 0, tarjeta: 0 };

  const lines = [];
  lines.push("BODEGA - CIERRE DEL DÍA");
  lines.push(formatDateTime(d.closedAt));
  lines.push("--------------------------------");
  lines.push(`Ventas: ${d.ventas}`);
  lines.push(`Total: ${money(d.total)}`);
  lines.push("");
  lines.push("Por método:");
  lines.push(`Efectivo: ${money(byPay.efectivo ?? 0)}`);
  lines.push(`Transferencia: ${money(byPay.transferencia ?? 0)}`);
  lines.push(`Tarjeta: ${money(byPay.tarjeta ?? 0)}`);
  lines.push("--------------------------------");
  lines.push("Detalle:");

  (d.sales || [])
    .slice()
    .reverse()
    .forEach((s) => {
      lines.push(`${formatTime(s.createdAt)} ${s.nombre}`);
      lines.push(
        `  ${s.qty} x ${money(s.precio)} = ${money(s.total)} (${
          s.paymentMethod || "efectivo"
        })`
      );
    });

  lines.push("--------------------------------");
  lines.push("Gracias");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ticket</title>
  <style>
    body { font-family: monospace; padding: 12px; }
    .ticket { width: 280px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="ticket">
    <pre>${lines.join("\n")}</pre>
  </div>
  <script>
    window.onload = () => { window.print(); window.close(); };
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * Calcula totales por método a partir de una lista de ventas.
 */
function calcByPaymentFromSales(sales) {
  const base = {
    efectivo: { ops: 0, units: 0, amount: 0 },
    transferencia: { ops: 0, units: 0, amount: 0 },
    tarjeta: { ops: 0, units: 0, amount: 0 },
  };

  (sales || []).forEach((s) => {
    const method = (s.paymentMethod || "efectivo").toLowerCase();
    const total = Number(s.total ?? 0);
    const qty = Number(s.qty ?? 0);

    const safeTotal = Number.isFinite(total) ? total : 0;
    const safeQty = Number.isFinite(qty) ? qty : 0;

    let bucket;
    if (method === "efectivo") bucket = base.efectivo;
    else if (method === "transferencia") bucket = base.transferencia;
    else bucket = base.tarjeta; // Cualquier otro (incluyendo "tarjeta") cae aquí

    bucket.ops += 1;
    bucket.units += safeQty;
    bucket.amount += safeTotal;
  });

  const totalAmount = base.efectivo.amount + base.transferencia.amount + base.tarjeta.amount;
  const totalOps = base.efectivo.ops + base.transferencia.ops + base.tarjeta.ops;
  const totalUnits = base.efectivo.units + base.transferencia.units + base.tarjeta.units;

  return { ...base, totalAmount, totalOps, totalUnits };
}

function getDayByPayment(d) {
  const fromSales = calcByPaymentFromSales(d?.sales || []);
  const byPay = d?.byPayment;
  if (!byPay) return fromSales;

  const efAmount = Number(byPay.efectivo ?? 0);
  const trAmount = Number(byPay.transferencia ?? 0);
  const tjAmount = Number(byPay.tarjeta ?? 0);

  const safeEf = Number.isFinite(efAmount) ? efAmount : 0;
  const safeTr = Number.isFinite(trAmount) ? trAmount : 0;
  const safeTj = Number.isFinite(tjAmount) ? tjAmount : 0;

  return {
    ...fromSales,
    efectivo: { ...fromSales.efectivo, amount: safeEf },
    transferencia: { ...fromSales.transferencia, amount: safeTr },
    tarjeta: { ...fromSales.tarjeta, amount: safeTj },
    totalAmount: safeEf + safeTr + safeTj,
  };
}

function ByPaymentTable({ data, title }) {
  if (!data) return null;

  return (
    <div style={{ marginTop: 10 }}>
      {title ? <b>{title}</b> : null}
      <table className="table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>Método</th>
            <th>Operaciones</th>
            <th>Unidades</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Efectivo</td>
            <td>{data.efectivo.ops}</td>
            <td>{data.efectivo.units}</td>
            <td>{money(data.efectivo.amount)}</td>
          </tr>
          <tr>
            <td>Transferencia</td>
            <td>{data.transferencia.ops}</td>
            <td>{data.transferencia.units}</td>
            <td>{money(data.transferencia.amount)}</td>
          </tr>
          <tr>
            <td>Tarjeta</td>
            <td>{data.tarjeta.ops}</td>
            <td>{data.tarjeta.units}</td>
            <td>{money(data.tarjeta.amount)}</td>
          </tr>
          <tr>
            <td><b>Total</b></td>
            <td><b>{data.totalOps}</b></td>
            <td><b>{data.totalUnits}</b></td>
            <td><b>{money(data.totalAmount)}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function DaySummary() {
  const { summary, sales, cancelSale, closeDay, days, deleteDay } = useBodega();
  const [openDayId, setOpenDayId] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const currentByPayment = useMemo(
    () => calcByPaymentFromSales(sales || []),
    [sales]
  );

  const exportDayCSV = (d) => {
    const rows = [];
    rows.push(["Cierre", formatDateTime(d.closedAt)]);
    rows.push(["Ventas", d.ventas]);
    rows.push(["Total", money(d.total)]);

    const byPay = d.byPayment || {};
    rows.push([]);
    rows.push(["Totales por método"]);
    rows.push(["Efectivo", money(byPay.efectivo ?? 0)]);
    rows.push(["Transferencia", money(byPay.transferencia ?? 0)]);
    rows.push(["Tarjeta", money(byPay.tarjeta ?? 0)]);

    rows.push([]);
    rows.push(["Hora", "Producto", "Cantidad", "Precio", "Total", "Pago"]);
    (d.sales || []).forEach((s) => {
      rows.push([
        formatTime(s.createdAt),
        s.nombre,
        s.qty,
        money(s.precio),
        money(s.total),
        s.paymentMethod || "efectivo",
      ]);
    });

    const safeDate = d.closedAt ? new Date(d.closedAt).toISOString().slice(0, 10) : "sin_fecha";
    downloadCSV(`cierre_${safeDate}.csv`, rows);
  };

  const filteredDays = useMemo(() => {
    return (days || []).filter((d) => {
      if (!d?.closedAt) return false;
      const dayDate = new Date(d.closedAt);
      if (fromDate) {
        const from = new Date(fromDate + "T00:00:00");
        if (dayDate < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate + "T23:59:59");
        if (dayDate > to) return false;
      }
      return true;
    });
  }, [days, fromDate, toDate]);

  return (
    <div>
      <h1>Resumen del día</h1>

      <div className="cards">
        <div className="card">
          <div className="label">Ventas</div>
          <div className="value">{summary?.ventas ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">Total</div>
          <div className="value">{money(summary?.total ?? 0)}</div>
        </div>
      </div>

      <h2>Totales por método (día actual)</h2>
      {(sales?.length ?? 0) === 0 ? (
        <p>Sin ventas todavía.</p>
      ) : (
        <ByPaymentTable data={currentByPayment} />
      )}

      <div style={{ display: "flex", gap: 10, margin: "12px 0" }}>
        <button
          type="button"
          onClick={closeDay}
          disabled={(sales?.length ?? 0) === 0}
        >
          Cerrar día
        </button>
      </div>

      {/* ... Resto de los componentes (Más vendidos, Historial, etc) ... */}
      <h2>Más vendidos</h2>
      {(summary?.top?.length ?? 0) === 0 ? (
        <p>Sin ventas todavía.</p>
      ) : (
        <ul>
          {summary.top.map((x, i) => (
            <li key={i}>{x.nombre} — {x.cantidad} u.</li>
          ))}
        </ul>
      )}

      <h2>Historial de ventas (día actual)</h2>
      {(sales?.length ?? 0) === 0 ? (
        <p>No hay ventas registradas todavía.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Total</th>
              <th>Pago</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{formatDateTime(s.createdAt)}</td>
                <td>{s.nombre}</td>
                <td>{s.qty}</td>
                <td>{money(s.precio)}</td>
                <td>{money(s.total)}</td>
                <td>{s.paymentMethod || "efectivo"}</td>
                <td>
                  <button type="button" onClick={() => cancelSale(s.id)}>Anular</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", margin: "12px 0" }}>
        <label style={{ display: "grid", gap: 6 }}>
          Desde <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Hasta <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <button type="button" onClick={() => { setFromDate(""); setToDate(""); }}>Limpiar</button>
      </div>

      <h2>Historial de cierres</h2>
      {(filteredDays?.length ?? 0) === 0 ? (
        <p>No hay cierres para ese rango.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Cerrado</th>
              <th>Ventas</th>
              <th>Total</th>
              <th>Detalle</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredDays.map((d) => {
              const isOpen = openDayId === d.id;
              const dayByPayment = isOpen ? getDayByPayment(d) : null;
              return (
                <React.Fragment key={d.id}>
                  <tr>
                    <td>{formatDateTime(d.closedAt)}</td>
                    <td>{d.ventas}</td>
                    <td>{money(d.total)}</td>
                    <td>
                      <button type="button" onClick={() => setOpenDayId(isOpen ? null : d.id)}>
                        {isOpen ? "Ocultar" : "Ver"}
                      </button>
                    </td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => exportDayCSV(d)}>CSV</button>
                      <button type="button" onClick={() => printTicket(d)}>Imprimir</button>
                      <button type="button" onClick={() => deleteDay(d.id)}>Eliminar</button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5}>
                        <div style={{ padding: 10, border: "1px solid #eee" }}>
                          <ByPaymentTable data={dayByPayment} title="Detalle de este cierre" />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}