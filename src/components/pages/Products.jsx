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
    const stock = Number(form.stock);
    const minimo = Number(form.minimo);

    if (!nombre) return alert("Nombre es requerido");
    if (!sku) return alert("SKU es requerido");
    if (!Number.isFinite(precio) || precio < 0) return alert("Precio inválido");
    if (!Number.isFinite(stock) || stock < 0) return alert("Stock inválido");
    if (!Number.isFinite(minimo) || minimo < 0) return alert("Mínimo inválido");

    addProduct({ nombre, sku, categoria, descripcion, precio, stock, minimo });
    setForm({ nombre: "", sku: "", categoria: "", descripcion: "", precio: "", stock: "", minimo: "" });
    setShowAdd(false);
  };

  // --- Edición inline ---
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ sku: "", categoria: "", descripcion: "", precio: "", minimo: "" });

  const startEdit = (p) => {
    setEditingId(p.id);
    setEdit({
      sku: p.sku ?? "",
      categoria: p.categoria ?? "",
      descripcion: p.descripcion ?? "",
      precio: p.precio ?? 0,
      minimo: p.minimo ?? 0,
    });
  };

  const saveEdit = (id) => {
    const sku = String(edit.sku || "").trim();
    const categoria = String(edit.categoria || "").trim();
    const descripcion = String(edit.descripcion || "").trim();
    const precio = Number(edit.precio);
    const minimo = Number(edit.minimo);

    if (!sku) return alert("SKU es requerido");
    if (!Number.isFinite(precio) || precio < 0) return alert("Precio inválido");
    if (!Number.isFinite(minimo) || minimo < 0) return alert("Mínimo inválido");

    updateProduct(id, { sku, categoria, descripcion, precio, minimo });
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
    let list = (products ||封装).filter((p) => {
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
        <button type="button" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? "Cerrar" : "➕ Agregar producto"}
        </button>

        <label style={{ display: "grid", gap: 6 }}>
          Buscar (nombre / SKU / categoría)
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej: coca, COCA-500..."
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Filtro
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
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

        <button type="button" onClick={() => { setQ(""); setFilter("all"); }}>
          Limpiar
        </button>
      </div>

      {showAdd && (
        <form className="form" onSubmit={onAddSubmit} style={{ marginTop: 20, border: "1px solid #ddd", padding: 15, borderRadius: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            <label>Nombre <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
            <label>SKU <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
            <label>Categoría <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></label>
            <label>Precio (Gs.) <input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} /></label>
            <label>Stock inicial <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
            <label>Stock mínimo <input type="number" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} /></label>
          </div>
          <button type="submit" style={{ marginTop: 10 }}>Guardar producto</button>
        </form>
      )}

      <table className="table" style={{ marginTop: 20, width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
            <th>Producto</th>
            <th>SKU</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Mínimo</th>
            <th>Alerta</th>
            <th>Entrada stock</th>
            <th>Estado</th>
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
                <td>{p.nombre}</td>
                <td>{isEditing ? <input value={edit.sku} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /> : p.sku}</td>
                <td>{isEditing ? <input value={edit.categoria} onChange={(e) => setEdit({ ...edit, categoria: e.target.value })} /> : p.categoria}</td>
                <td>{isEditing ? <input type="number" value={edit.precio} onChange={(e) => setEdit({ ...edit, precio: e.target.value })} /> : money(p.precio)}</td>
                <td>{stock}</td>
                <td>{isEditing ? <input type="number" value={edit.minimo} onChange={(e) => setEdit({ ...edit, minimo: e.target.value })} /> : minimo}</td>
                <td style={{ color: alerta ? "red" : "inherit" }}>{alerta ? "⚠️ Bajo" : active ? "OK" : "-"}</td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input
                      type="number"
                      placeholder="+"
                      style={{ width: 50 }}
                      value={stockIn[p.id] ?? ""}
                      onChange={(e) => setStockIn({ ...stockIn, [p.id]: e.target.value })}
                      disabled={!active}
                    />
                    <button disabled={!active} onClick={() => {
                      const qty = Number(stockIn[p.id]);
                      if (qty > 0) { addStock(p.id, qty); setStockIn({ ...stockIn, [p.id]: "" }); }
                    }}>Agregar</button>
                  </div>
                </td>
                <td>
                  <button onClick={() => active ? deactivateProduct?.(p.id) : activateProduct?.(p.id)}>
                    {active ? "Desactivar" : "Activar"}
                  </button>
                </td>
                <td>
                  {isEditing ? (
                    <>
                      <button onClick={() => saveEdit(p.id)}>OK</button>
                      <button onClick={() => setEditingId(null)}>X</button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(p)}>Editar</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}