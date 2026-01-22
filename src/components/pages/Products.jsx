import React, { useMemo, useState } from "react";
import { useBodega } from "../../store/BodegaContext";

/** Guaraní (PYG) sin decimales */
const money = (value) => {
  const n = Math.round(Number(value ?? 0));
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
};

export default function Products() {
  const {
    products,
    addProduct,
    updateProduct,
    addStock,
    deactivateProduct,
    activateProduct,
  } = useBodega();

  // --- UI: búsqueda y filtros ---
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | low | zero | inactive
  const [sortLowFirst, setSortLowFirst] = useState(true);

  // --- Form Agregar Producto ---
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    sku: "",
    categoria: "",
    descripcion: "",
    precio: "",
    precioOferta: 0, // ✅ Agregado
    stock: "",
    minimo: "",
  });

  const onAddSubmit = (e) => {
    e.preventDefault();
    const nombre = String(form.nombre || "").trim();
    const sku = String(form.sku || "").trim();
    const categoria = String(form.categoria || "").trim();
    const descripcion = String(form.descripcion || "").trim();
    const precio = Number(form.precio);
    const precioOferta = Number(form.precioOferta);
    const stock = Number(form.stock);
    const minimo = Number(form.minimo);

    if (!nombre) return alert("Nombre es requerido");
    if (!sku) return alert("SKU es requerido");
    if (!Number.isFinite(precio) || precio < 0) return alert("Precio inválido");
    if (precioOferta < 0) return alert("Precio de oferta no puede ser negativo");
    if (!Number.isFinite(stock) || stock < 0) return alert("Stock inválido");
    if (!Number.isFinite(minimo) || minimo < 0) return alert("Mínimo inválido");

    addProduct({ nombre, sku, categoria, descripcion, precio, precioOferta, stock, minimo });
    setForm({ nombre: "", sku: "", categoria: "", descripcion: "", precio: "", precioOferta: 0, stock: "", minimo: "" });
    setShowAdd(false);
  };

  // --- Edición inline ---
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ sku: "", categoria: "", descripcion: "", precio: "", precioOferta: 0, minimo: "" });

  const startEdit = (p) => {
    setEditingId(p.id);
    setEdit({
      sku: p.sku ?? "",
      categoria: p.categoria ?? "",
      descripcion: p.descripcion ?? "",
      precio: p.precio ?? 0,
      precioOferta: p.precioOferta ?? 0, // ✅ Agregado
      minimo: p.minimo ?? 0,
    });
  };

  const saveEdit = (id) => {
    const sku = String(edit.sku || "").trim();
    const categoria = String(edit.categoria || "").trim();
    const descripcion = String(edit.descripcion || "").trim();
    const precio = Number(edit.precio);
    const precioOferta = Number(edit.precioOferta);
    const minimo = Number(edit.minimo);

    if (!sku) return alert("SKU es requerido");
    if (!Number.isFinite(precio) || precio < 0) return alert("Precio inválido");
    if (precioOferta < 0) return alert("Oferta inválida");
    if (!Number.isFinite(minimo) || minimo < 0) return alert("Mínimo inválido");

    updateProduct(id, { sku, categoria, descripcion, precio, precioOferta, minimo });
    setEditingId(null);
  };

  // --- Entrada de stock ---
  const [stockIn, setStockIn] = useState({});

  const stockAlertsCount = useMemo(() => {
    return (products || [])
      .filter((p) => p.active !== false)
      .filter((p) => Number(p.stock ?? 0) <= Number(p.minimo ?? 0)).length;
  }, [products]);

  // --- Lista filtrada ---
  const visibleProducts = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = (products || []).filter((p) => {
      const nombre = String(p.nombre || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();
      const categoria = String(p.categoria || "").toLowerCase();

      if (query && !nombre.includes(query) && !sku.includes(query) && !categoria.includes(query)) {
        return false;
      }

      const stock = Number(p.stock ?? 0);
      const minimo = Number(p.minimo ?? 0);
      const active = p.active !== false;

      if (filter === "low") return active && stock <= minimo;
      if (filter === "zero") return active && stock === 0;
      if (filter === "inactive") return !active;
      if (filter === "all") return active;
      return true;
    });

    if (sortLowFirst) {
      list = [...list].sort((a, b) => {
        const aActive = a.active !== false;
        const bActive = b.active !== false;
        if (aActive !== bActive) return aActive ? -1 : 1;
        const aLow = Number(a.stock ?? 0) <= Number(a.minimo ?? 0);
        const bLow = Number(b.stock ?? 0) <= Number(b.minimo ?? 0);
        if (aLow === bLow) return String(a.nombre || "").localeCompare(String(b.nombre || ""));
        return aLow ? -1 : 1;
      });
    }
    return list;
  }, [products, q, filter, sortLowFirst]);

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ marginBottom: 0 }}>Productos</h1>
        <span style={{ color: "#666" }}>
          Alertas: <b>{stockAlertsCount}</b>
        </span>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <button type="button" onClick={() => setShowAdd((s) => !s)} style={{ padding: '10px 15px', cursor: 'pointer' }}>
          {showAdd ? "Cerrar" : "➕ Agregar producto"}
        </button>

        <label style={{ display: "grid", gap: 6 }}>
          Buscar (nombre / SKU / categoría)
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej: coca, COCA-500..."
            style={{ padding: '8px' }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Filtro
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '8px' }}>
            <option value="all">Activos</option>
            <option value="low">Stock bajo ({"<="} mínimo)</option>
            <option value="zero">Sin stock (= 0)</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={sortLowFirst}
            onChange={(e) => setSortLowFirst(e.target.checked)}
          />
          Alertas primero
        </label>

        <button type="button" onClick={() => { setQ(""); setFilter("all"); }} style={{ padding: '8px' }}>
          Limpiar
        </button>
      </div>

      {showAdd && (
        <form className="form" onSubmit={onAddSubmit} style={{ marginTop: 20, border: "2px solid #007bff", padding: 15, borderRadius: 8, background: '#f8f9fa' }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            <label>Nombre <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
            <label>SKU <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
            <label>Categoría <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></label>
            <label>Precio Normal (Gs.) <input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} /></label>
            <label>Precio Oferta (Opcional) <input type="number" value={form.precioOferta} onChange={(e) => setForm({ ...form, precioOferta: e.target.value })} style={{ border: form.precioOferta > 0 ? '2px solid #28a745' : '1px solid #ccc' }} /></label>
            <label>Stock inicial <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
            <label>Stock mínimo <input type="number" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} /></label>
          </div>
          <button type="submit" style={{ marginTop: 15, padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar nuevo producto</button>
        </form>
      )}

      <table className="table" style={{ marginTop: 20, width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #eee", background: '#f2f2f2' }}>
            <th style={{ padding: '10px' }}>Producto</th>
            <th>SKU</th>
            <th>Precio Unit.</th>
            <th>Oferta</th>
            <th>Stock</th>
            <th>Mínimo</th>
            <th>Estado</th>
            <th>Entrada</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {visibleProducts.map((p) => {
            const stock = Number(p.stock ?? 0);
            const minimo = Number(p.minimo ?? 0);
            const active = p.active !== false;
            const alerta = active && stock <= minimo;
            const isEditing = editingId === p.id;

            return (
              <tr key={p.id} style={{ opacity: active ? 1 : 0.6, borderBottom: "1px solid #eee" }}>
                <td style={{ padding: '10px' }}><b>{p.nombre}</b><br/><small>{p.categoria}</small></td>
                <td>{isEditing ? <input style={{width: '80px'}} value={edit.sku} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /> : p.sku}</td>
                <td>{isEditing ? <input type="number" style={{width: '80px'}} value={edit.precio} onChange={(e) => setEdit({ ...edit, precio: e.target.value })} /> : money(p.precio)}</td>
                <td>
                  {isEditing ? (
                    <input type="number" style={{width: '80px', border: '1px solid #28a745'}} value={edit.precioOferta} onChange={(e) => setEdit({ ...edit, precioOferta: e.target.value })} />
                  ) : (
                    p.precioOferta > 0 ? <b style={{color: '#28a745'}}>{money(p.precioOferta)}</b> : "-"
                  )}
                </td>
                <td style={{ fontWeight: alerta ? 'bold' : 'normal', color: alerta ? 'red' : 'black' }}>{stock}</td>
                <td>{isEditing ? <input type="number" style={{width: '50px'}} value={edit.minimo} onChange={(e) => setEdit({ ...edit, minimo: e.target.value })} /> : minimo}</td>
                <td><span style={{ padding: '2px 6px', borderRadius: '4px', background: alerta ? '#ffebee' : 'transparent', color: alerta ? 'red' : 'inherit' }}>{alerta ? "⚠️ Bajo" : active ? "OK" : "Inactivo"}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input
                      type="number"
                      placeholder="+"
                      style={{ width: 45, padding: '4px' }}
                      value={stockIn[p.id] ?? ""}
                      onChange={(e) => setStockIn({ ...stockIn, [p.id]: e.target.value })}
                      disabled={!active}
                    />
                    <button disabled={!active} onClick={() => {
                      const qty = Number(stockIn[p.id]);
                      if (qty > 0) { addStock(p.id, qty); setStockIn({ ...stockIn, [p.id]: "" }); }
                    }}>Add</button>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(p.id)} style={{background: '#28a745', color: 'white'}}>💾</button>
                        <button onClick={() => setEditingId(null)}>🚫</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(p)}>📝</button>
                        <button onClick={() => active ? deactivateProduct?.(p.id) : activateProduct?.(p.id)}>
                          {active ? "🔒" : "🔓"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}