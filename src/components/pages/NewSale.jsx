import React, { useEffect, useMemo, useState } from "react";
import { useBodega } from "../../store/BodegaContext";

/** Guaraní (PYG) sin decimales */
const money = (value, currency = "PYG", locale = "es-PY") => {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
};

export default function NewSale() {
  const { products, sell } = useBodega();

  // Solo activos
  const activeProducts = useMemo(
    () => (products || []).filter((p) => p.active !== false),
    [products]
  );

  // buscador + selector para "agregar item"
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState(activeProducts[0]?.id ?? 1);
  const [qty, setQty] = useState(1);

  // método para TODO el ticket
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

  // carrito: [{ productId, qty }]
  const [items, setItems] = useState([]);

  if (!activeProducts.length) return <p>No hay productos activos cargados.</p>;

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeProducts;

    return activeProducts.filter((p) => {
      const nombre = String(p.nombre || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();
      const categoria = String(p.categoria || "").toLowerCase();
      return nombre.includes(q) || sku.includes(q) || categoria.includes(q);
    });
  }, [activeProducts, query]);

  // asegurar productId válido si cambian productos activos
  useEffect(() => {
    if (!activeProducts.length) return;
    const exists = activeProducts.some((p) => p.id === Number(productId));
    if (!exists) setProductId(activeProducts[0].id);
  }, [activeProducts, productId]);

  // mantener productId válido dentro del filtro
  useEffect(() => {
    if (!filteredProducts.length) return;
    const exists = filteredProducts.some((p) => p.id === Number(productId));
    if (!exists) setProductId(filteredProducts[0].id);
  }, [filteredProducts, productId]);

  // helper: stock disponible considerando lo que ya está en el carrito
  const availableStockFor = (pid) => {
    const p = activeProducts.find((x) => x.id === Number(pid));
    const inCart = items
      .filter((it) => Number(it.productId) === Number(pid))
      .reduce((acc, it) => acc + Number(it.qty || 0), 0);
    return Number(p?.stock ?? 0) - inCart;
  };

  const selected = useMemo(
    () => activeProducts.find((p) => p.id === Number(productId)),
    [activeProducts, productId]
  );

  const addItem = () => {
    if (!selected) return;

    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0)
      return alert("Cantidad debe ser mayor a 0");

    const available = availableStockFor(selected.id);
    if (q > available) {
      return alert(
        `No hay stock suficiente. Disponible para agregar: ${Math.max(available, 0)}`
      );
    }

    setItems((prev) => {
      const idx = prev.findIndex((it) => Number(it.productId) === selected.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: Number(copy[idx].qty) + q };
        return copy;
      }
      return [...prev, { productId: selected.id, qty: q }];
    });

    setQty(1);
    setQuery("");
  };

  const removeItem = (pid) => {
    setItems((prev) =>
      prev.filter((it) => Number(it.productId) !== Number(pid))
    );
  };

  const updateItemQty = (pid, newQty) => {
    const q = Number(newQty);
    if (!Number.isFinite(q) || q <= 0) return;

    const p = activeProducts.find((x) => x.id === Number(pid));
    if (!p) return alert("Producto inválido o inactivo.");

    const maxAllowed = Number(p.stock ?? 0);
    if (q > maxAllowed) {
      return alert(`No hay stock suficiente. Máximo: ${Math.max(maxAllowed, 0)}`);
    }

    setItems((prev) =>
      prev.map((it) =>
        Number(it.productId) === Number(pid) ? { ...it, qty: q } : it
      )
    );
  };

  const cartTotal = useMemo(() => {
    return items.reduce((acc, it) => {
      const p = activeProducts.find((x) => x.id === Number(it.productId));
      const price = Number(p?.precio ?? 0) || 0;
      return acc + price * Number(it.qty || 0);
    }, 0);
  }, [items, activeProducts]);

  const submitAll = (e) => {
    e.preventDefault();
    if (!items.length) return alert("Agregá al menos un producto al carrito.");

    // validar stock final por producto (por si cambió algo)
    for (const it of items) {
      const p = activeProducts.find((x) => x.id === Number(it.productId));
      if (!p) return alert("Hay un producto inválido o inactivo en el carrito.");

      const q = Number(it.qty);
      if (!Number.isFinite(q) || q <= 0) return alert("Hay cantidades inválidas.");
      if (q > Number(p.stock ?? 0)) {
        return alert(`No hay stock suficiente para ${p.nombre}. Stock: ${p.stock}`);
      }
    }

    // registrar cada item como una venta (con el mismo método)
    items.forEach((it) => {
      sell({
        productId: Number(it.productId),
        qty: Number(it.qty),
        paymentMethod, // ahora puede ser: efectivo | transferencia | tarjeta
      });
    });

    setItems([]);
    setQty(1);
    setQuery("");
    alert("Venta registrada ✅");
  };

  return (
    <div>
      <h1>Nueva venta</h1>

      {/* Agregar productos al carrito */}
      <div className="form" style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          Buscar producto (nombre / SKU / categoría)
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: coca, COCA-500, bebidas…"
          />
        </label>

        <label>
          Producto
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id} disabled={Number(p.stock ?? 0) <= 0}>
                {p.nombre} {p.sku ? `(${p.sku})` : ""} — stock: {p.stock}
              </option>
            ))}
          </select>

          <small style={{ opacity: 0.7 }}>
            Disponible para agregar: {Math.max(availableStockFor(productId), 0)}
          </small>

          {filteredProducts.length === 0 ? (
            <small style={{ opacity: 0.7 }}>No hay coincidencias.</small>
          ) : null}
        </label>

        <label>
          Cantidad
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
        </label>

        <button type="button" onClick={addItem} disabled={!selected}>
          Agregar al carrito
        </button>

        <label>
          Método de pago (para todo el ticket)
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </label>
      </div>

      {/* Carrito */}
      <h2 style={{ marginTop: 18 }}>Carrito</h2>
      {items.length === 0 ? (
        <p>Sin productos agregados.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Sub-total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const p = activeProducts.find((x) => x.id === Number(it.productId));
              const price = Number(p?.precio ?? 0) || 0;
              const sub = price * Number(it.qty || 0);

              return (
                <tr key={it.productId}>
                  <td>
                    {p?.nombre ?? "—"} {p?.sku ? `(${p.sku})` : ""}
                  </td>
                  <td style={{ width: 120 }}>
                    <input
                      type="number"
                      min="1"
                      value={it.qty}
                      onChange={(e) => updateItemQty(it.productId, e.target.value)}
                    />
                  </td>
                  <td>{money(price)}</td>
                  <td>{money(sub)}</td>
                  <td>
                    <button type="button" onClick={() => removeItem(it.productId)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="total" style={{ marginTop: 10 }}>
        Total: <b>{money(cartTotal)}</b>
      </div>

      <form onSubmit={submitAll} style={{ marginTop: 10 }}>
        <button type="submit" disabled={items.length === 0}>
          Registrar venta
        </button>
      </form>
    </div>
  );
}
