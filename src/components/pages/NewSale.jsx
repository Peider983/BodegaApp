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

  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState(activeProducts[0]?.id ?? 1);
  const [qty, setQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
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

  useEffect(() => {
    if (!activeProducts.length) return;
    const exists = activeProducts.some((p) => p.id === Number(productId));
    if (!exists) setProductId(activeProducts[0].id);
  }, [activeProducts, productId]);

  useEffect(() => {
    if (!filteredProducts.length) return;
    const exists = filteredProducts.some((p) => p.id === Number(productId));
    if (!exists) setProductId(filteredProducts[0].id);
  }, [filteredProducts, productId]);

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
    if (!Number.isFinite(q) || q <= 0) return alert("Cantidad debe ser mayor a 0");

    const available = availableStockFor(selected.id);
    if (q > available) {
      return alert(`No hay stock suficiente. Disponible: ${Math.max(available, 0)}`);
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
    setItems((prev) => prev.filter((it) => Number(it.productId) !== Number(pid)));
  };

  const updateItemQty = (pid, newQty) => {
    const q = Number(newQty);
    if (!Number.isFinite(q) || q <= 0) return;
    const p = activeProducts.find((x) => x.id === Number(pid));
    if (!p) return;

    if (q > Number(p.stock ?? 0)) {
      return alert(`No hay stock suficiente. Máximo: ${p.stock}`);
    }

    setItems((prev) =>
      prev.map((it) => (Number(it.productId) === Number(pid) ? { ...it, qty: q } : it))
    );
  };

  // ✅ TOTAL ACTUALIZADO: Detecta si usa precio normal u oferta
  const cartTotal = useMemo(() => {
    return items.reduce((acc, it) => {
      const p = activeProducts.find((x) => x.id === Number(it.productId));
      const price = (p?.precioOferta > 0) ? p.precioOferta : (p?.precio ?? 0);
      return acc + price * Number(it.qty || 0);
    }, 0);
  }, [items, activeProducts]);

  const submitAll = (e) => {
    e.preventDefault();
    if (!items.length) return alert("Agregá al menos un producto.");

    items.forEach((it) => {
      sell({
        productId: Number(it.productId),
        qty: Number(it.qty),
        paymentMethod,
      });
    });

    setItems([]);
    alert("Venta registrada ✅");
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Nueva venta</h1>

      <div className="form" style={{ display: "grid", gap: 10, maxWidth: 520, background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
        <label>
          Buscar producto
          <input
            style={inputStyle}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: coca, hielo..."
          />
        </label>

        <label>
          Producto
          <select style={inputStyle} value={productId} onChange={(e) => setProductId(e.target.value)}>
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id} disabled={Number(p.stock ?? 0) <= 0}>
                {p.nombre} {p.precioOferta > 0 ? `[OFERTA: ${money(p.precioOferta)}]` : `(${money(p.precio)})`} — stock: {p.stock}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ flex: 1 }}>
            Cantidad
            <input
              style={inputStyle}
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </label>
          <button type="button" onClick={addItem} style={btnAddStyle} disabled={!selected}>
            Agregar
          </button>
        </div>

        <label>
          Método de pago
          <select style={inputStyle} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </label>
      </div>

      <h2 style={{ marginTop: 25 }}>Carrito</h2>
      {items.length === 0 ? (
        <p style={{ color: '#666' }}>Sin productos en el carrito.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#eee', textAlign: 'left' }}>
              <th style={tdStyle}>Producto</th>
              <th style={tdStyle}>Cant.</th>
              <th style={tdStyle}>Precio unit.</th>
              <th style={tdStyle}>Sub-total</th>
              <th style={tdStyle}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const p = activeProducts.find((x) => x.id === Number(it.productId));
              const hasOffer = p?.precioOferta > 0;
              const price = hasOffer ? p.precioOferta : (p?.precio ?? 0);
              const sub = price * Number(it.qty || 0);

              return (
                <tr key={it.productId} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>
                    {p?.nombre} {p?.sku && <small style={{ color: '#999' }}>({p.sku})</small>}
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={{ width: '60px', padding: '5px' }}
                      type="number"
                      min="1"
                      value={it.qty}
                      onChange={(e) => updateItemQty(it.productId, e.target.value)}
                    />
                  </td>
                  <td style={tdStyle}>
                    {hasOffer ? (
                      <div>
                        <span style={{ textDecoration: 'line-through', color: 'red', fontSize: '11px', marginRight: '5px' }}>{money(p.precio)}</span>
                        <b style={{ color: '#28a745' }}>{money(price)}</b>
                      </div>
                    ) : (
                      money(price)
                    )}
                  </td>
                  <td style={tdStyle}>{money(sub)}</td>
                  <td style={tdStyle}>
                    <button onClick={() => removeItem(it.productId)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Quitar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: '20px', padding: '15px', background: '#333', color: '#fff', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '1.2rem' }}>Total a cobrar:</span>
        <b style={{ fontSize: '1.5rem' }}>{money(cartTotal)}</b>
      </div>

      <button 
        onClick={submitAll} 
        disabled={items.length === 0}
        style={{ width: '100%', marginTop: '15px', padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
      >
        REGISTRAR VENTA FINAL
      </button>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' };
const btnAddStyle = { padding: '0 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
const tdStyle = { padding: '12px 10px' };