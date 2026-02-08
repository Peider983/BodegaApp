
import React, { useEffect, useMemo, useState } from "react";
import { useBodega } from "../../store/BodegaContext";
import "./NewSale.css";

const money = (value) => {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    minimumFractionDigits: 0,
  }).format(Number(value ?? 0));
};

export default function NewSale() {
  const { products, sell } = useBodega();
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState("");
  const [priceOptionId, setPriceOptionId] = useState(""); // ✅ NUEVO
  const [qty, setQty] = useState(1); // qty = cantidad de packs/unidades seleccionadas
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [items, setItems] = useState([]);

  const activeProducts = useMemo(
    () => (products || []).filter((p) => p.active !== false),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? activeProducts.filter(
          (p) =>
            p.nombre.toLowerCase().includes(q) ||
            (p.sku || "").toLowerCase().includes(q)
        )
      : activeProducts;
  }, [activeProducts, query]);

  // ✅ producto seleccionado
  const selectedProduct = useMemo(() => {
    return activeProducts.find((p) => p.id === Number(productId)) || null;
  }, [activeProducts, productId]);

  // ✅ opciones de precio del producto seleccionado
  const priceOptions = useMemo(() => {
    const list = selectedProduct?.precios || [];
    return list.filter((x) => x.activo !== false);
  }, [selectedProduct]);

  // set producto y opción por defecto
  useEffect(() => {
    if (filteredProducts.length > 0) setProductId(filteredProducts[0].id);
  }, [filteredProducts]);

  useEffect(() => {
    // al cambiar producto, elegir primera opción activa por defecto
    if (priceOptions.length > 0) setPriceOptionId(String(priceOptions[0].id));
    else setPriceOptionId("");
    setQty(1);
  }, [productId, priceOptions.length]); // eslint-disable-line

  const selectedPriceOption = useMemo(() => {
    return priceOptions.find((o) => String(o.id) === String(priceOptionId)) || null;
  }, [priceOptions, priceOptionId]);

  const addItem = () => {
    const p = selectedProduct;
    const opt = selectedPriceOption;
    if (!p || !opt || qty <= 0) return;

    const packQty = Number(opt.cantidad); // 1, 6, 12...
    const unitsToDiscount = packQty * qty; // ✅ lo que descuenta stock
    const price = Number(opt.precio);

    // ✅ validar stock considerando carrito
    const inCartUnits = items
      .filter((it) => it.productId === p.id)
      .reduce((acc, it) => acc + (it.unitsToDiscount || 0), 0);

    if (unitsToDiscount > (p.stock - inCartUnits)) {
      return alert("Stock insuficiente");
    }

    setItems((prev) => {
      // si mismo producto + misma opción de precio -> suma qty
      const idx = prev.findIndex(
        (it) => it.productId === p.id && String(it.priceOptionId) === String(opt.id)
      );

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].qty += qty;
        copy[idx].unitsToDiscount += unitsToDiscount;
        return copy;
      }

      return [
        ...prev,
        {
          productId: p.id,
          productName: p.nombre,
          priceOptionId: opt.id,
          priceType: opt.tipo,
          packQty,
          price,
          qty, // cantidad de packs/unidades elegidas
          unitsToDiscount, // ✅ unidades que descuenta stock
        },
      ];
    });

    setQty(1);
  };

  const removeItem = (key) => setItems((prev) => prev.filter((it) => it.key !== key));

  // ✅ agrego una key estable para cada item
  const itemsWithKey = useMemo(() => {
    return items.map((it) => ({
      ...it,
      key: `${it.productId}-${it.priceOptionId}`,
    }));
  }, [items]);

  const cartTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.price * it.qty), 0);
  }, [items]);

  const submitAll = () => {
    // ✅ vendemos cada item con su opción elegida
    items.forEach((it) =>
      sell({
        productId: it.productId,
        qty: it.unitsToDiscount, // ✅ OJO: acá mandamos unidades a descontar
        paymentMethod,
        priceOptionId: it.priceOptionId, // ✅ si querés guardar detalle en backend
        price: it.price, // ✅ si querés guardar el precio usado
        packs: it.qty, // ✅ cantidad de packs/unidades seleccionadas
      })
    );

    setItems([]);
    alert("Venta registrada ✅");
  };

  const optionLabel = (o) => {
    const tipo =
      o.tipo === "UNIDAD" ? "Unidad" : o.tipo === "PACK" ? "Pack" : "Promo";
    return `${tipo} x${o.cantidad} — ${money(o.precio)}`;
  };

  return (
    <div className="sale-container">
      <header className="sale-header">
        <h1>💰 Nueva Venta</h1>
        <div className="method-badge">{paymentMethod.toUpperCase()}</div>
      </header>

      <div className="sale-layout">
        <section>
          <div className="sale-card">
            <h3 className="sale-card-title">1. Producto</h3>

            <label className="sale-label">Buscar</label>
            <input
              className="sale-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar..."
            />

            <label className="sale-label">Seleccionar</label>
            <select
              className="sale-input"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {filteredProducts.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                  {p.nombre} ({p.stock} ud.)
                </option>
              ))}
            </select>

            {/* ✅ NUEVO: selector de precio */}
            <label className="sale-label">Precio</label>
            <select
              className="sale-input"
              value={priceOptionId}
              onChange={(e) => setPriceOptionId(e.target.value)}
              disabled={priceOptions.length === 0}
            >
              {priceOptions.length === 0 && <option>No hay precios cargados</option>}
              {priceOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {optionLabel(o)}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label className="sale-label">
                  Cantidad ({selectedPriceOption ? `x${selectedPriceOption.cantidad}` : ""})
                </label>
                <input
                  className="sale-input"
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
                {/* ✅ ayuda visual */}
                {selectedPriceOption && (
                  <small style={{ display: "block", marginTop: 6, opacity: 0.8 }}>
                    Descuenta stock: <b>{Number(selectedPriceOption.cantidad) * qty}</b> unidades
                  </small>
                )}
              </div>

              <button className="sale-btn-add" onClick={addItem}>
                Añadir
              </button>
            </div>
          </div>

          <div className="sale-card">
            <h3 className="sale-card-title">2. Pago</h3>
            <select
              className="sale-input"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="efectivo">💵 Efectivo</option>
              <option value="transferencia">📱 Transferencia</option>
              <option value="tarjeta">💳 Tarjeta</option>
            </select>
          </div>
        </section>

        <section className="sale-card">
          <h3 className="sale-card-title">🛒 Carrito</h3>
          <div className="table-wrapper">
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cant.</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {itemsWithKey.map((it) => (
                  <tr key={it.key}>
                    <td>{it.productName}</td>
                    <td>
                      {it.priceType} x{it.packQty}
                    </td>
                    <td>{it.qty}</td>
                    <td>{money(it.price * it.qty)}</td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter(
                              (x) =>
                                !(
                                  x.productId === it.productId &&
                                  String(x.priceOptionId) === String(it.priceOptionId)
                                )
                            )
                          )
                        }
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cart-footer">
            <div className="total-row">
              <span>Total:</span>
              <span className="total-amount">{money(cartTotal)}</span>
            </div>
            <button className="btn-confirm" disabled={items.length === 0} onClick={submitAll}>
              CONFIRMAR VENTA
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
