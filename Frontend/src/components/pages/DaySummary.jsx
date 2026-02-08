
import React, { useMemo, useState } from "react";
import { useBodega } from "../../store/BodegaContext";
import "./DaySummary.css";

// --- Helpers de Moneda y Fecha (Iguales a los tuyos) ---
const money = (v) => new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(v || 0);
const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const formatDateTime = (iso) => new Date(iso).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// Componente de tabla reutilizable para métodos de pago
function ByPaymentTable({ data, title }) {
  if (!data) return null;
  return (
    <div className="detail-box">
      {title && <b style={{ display: 'block', marginBottom: '10px' }}>{title}</b>}
      <table className="summary-table">
        <thead>
          <tr>
            <th>Método</th>
            <th>Ops</th>
            <th>Unidades</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Efectivo</td><td>{data.efectivo.ops}</td><td>{data.efectivo.units}</td><td>{money(data.efectivo.amount)}</td></tr>
          <tr><td>Transferencia</td><td>{data.transferencia.ops}</td><td>{data.transferencia.units}</td><td>{money(data.transferencia.amount)}</td></tr>
          <tr><td>Tarjeta</td><td>{data.tarjeta.ops}</td><td>{data.tarjeta.units}</td><td>{money(data.tarjeta.amount)}</td></tr>
          <tr style={{ fontWeight: 'bold', background: '#f1f3f5' }}>
            <td>Total</td><td>{data.totalOps}</td><td>{data.totalUnits}</td><td>{money(data.totalAmount)}</td>
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

  const currentByPayment = useMemo(() => {
    const base = {
      efectivo: { ops: 0, units: 0, amount: 0 },
      transferencia: { ops: 0, units: 0, amount: 0 },
      tarjeta: { ops: 0, units: 0, amount: 0 },
    };
    sales.forEach(s => {
      const m = (s.paymentMethod || "efectivo").toLowerCase();
      const target = base[m] || base.tarjeta;
      target.ops += 1;
      target.units += s.qty;
      target.amount += s.total;
    });
    return { ...base, totalOps: sales.length, totalUnits: sales.reduce((a,b)=>a+b.qty,0), totalAmount: sales.reduce((a,b)=>a+b.total,0) };
  }, [sales]);

  const filteredDays = useMemo(() => {
    return (days || []).filter(d => {
      if (!fromDate && !toDate) return true;
      const dDate = new Date(d.closedAt).toISOString().split('T')[0];
      if (fromDate && dDate < fromDate) return false;
      if (toDate && dDate > toDate) return false;
      return true;
    });
  }, [days, fromDate, toDate]);

  return (
    <div className="summary-container">
      <header className="sale-header">
        <h1>📅 Resumen de Caja</h1>
      </header>

      {/* KPIs */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-label">Ventas Hoy</div>
          <div className="card-value">{sales.length}</div>
        </div>
        <div className="summary-card total">
          <div className="card-label">Monto en Caja</div>
          <div className="card-value">{money(currentByPayment.totalAmount)}</div>
        </div>
      </div>

      {/* Ventas Actuales */}
      <h2 className="summary-section-title">📦 Operaciones en curso</h2>
      <div className="sale-layout">

        <div className="table-container">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td>{formatTime(s.createdAt)}</td>
                  <td>{s.nombre}</td>
                  <td>{s.qty}</td>
                  <td>{money(s.total)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.paymentMethod}</td>
                  <td><button className="btn btn-danger btn-small" onClick={() => cancelSale(s.id)}>Anular</button></td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No hay ventas en el turno actual</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="sale-card">
          <h3 className="sale-card-title">Resumen por Método</h3>
          <ByPaymentTable data={currentByPayment} />
          <button className="btn btn-success" onClick={closeDay} disabled={sales.length === 0}>
            CERRAR CAJA Y ARCHIVAR
          </button>
        </div>
      </div>

      {/* Historial con Filtros */}
      <h2 className="summary-section-title">📂 Historial de Cierres</h2>
      <div className="filter-bar">
        <div className="filter-group">
          <label>Desde</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Hasta</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <button className="btn btn-outline" onClick={() => { setFromDate(""); setToDate(""); }}>Limpiar</button>
      </div>

      <div className="table-container">
        <table className="summary-table">
          <thead>
            <tr>
              <th>Fecha Cierre</th>
              <th>Ventas</th>
              <th>Total</th>
              <th>Detalles</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredDays.map(d => (
              <React.Fragment key={d.id}>
                <tr>
                  <td>{formatDateTime(d.closedAt)}</td>
                  <td>{d.ventas}</td>
                  <td>{money(d.total)}</td>
                  <td>
                    <button className="btn btn-outline btn-small" onClick={() => setOpenDayId(openDayId === d.id ? null : d.id)}>
                      {openDayId === d.id ? "Cerrar" : "Ver detalle"}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="btn btn-primary btn-small" onClick={() => window.print()}>🖨️</button>
                      <button className="btn btn-danger btn-small" onClick={() => deleteDay(d.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
                {openDayId === d.id && (
                  <tr>
                    <td colSpan="5">
                      <ByPaymentTable data={d.byPayment ? {
                        efectivo: { amount: d.byPayment.efectivo, ops: '-', units: '-' },
                        transferencia: { amount: d.byPayment.transferencia, ops: '-', units: '-' },
                        tarjeta: { amount: d.byPayment.tarjeta, ops: '-', units: '-' },
                        totalAmount: d.total, totalOps: d.ventas, totalUnits: '-'
                      } : null} title="Cierre Guardado" />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}