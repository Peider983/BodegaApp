
 import React, { useMemo, useState } from "react";
import { useBodega } from "../../store/BodegaContext";
import "./Products.css";

const money = (v) => new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(v || 0);

export default function Products() {
  const { products, addProduct, updateProduct, addStock, deactivateProduct, activateProduct } = useBodega();

  // Estados de UI
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortLowFirst, setSortLowFirst] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Formulario Nuevo
  const [form, setForm] = useState({ nombre: "", sku: "", categoria: "", precio: "", precioOferta: 0, stock: "", minimo: "" });
  
  // Edición Inline
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({});
  const [stockIn, setStockIn] = useState({});

  const activeProducts = (products || []).filter(p => p.active !== false);
  const stockAlertsCount = activeProducts.filter(p => p.stock <= p.minimo).length;

  const visibleProducts = useMemo(() => {
    let list = (products || []).filter(p => {
      const matchQuery = [p.nombre, p.sku, p.categoria].some(text => String(text).toLowerCase().includes(q.toLowerCase()));
      if (filter === "low") return p.active && p.stock <= p.minimo;
      if (filter === "zero") return p.active && p.stock === 0;
      if (filter === "inactive") return !p.active;
      return p.active && matchQuery;
    });

    if (sortLowFirst) {
      list.sort((a, b) => (a.stock <= a.minimo === b.stock <= b.minimo) ? 0 : a.stock <= a.minimo ? -1 : 1);
    }
    return list;
  }, [products, q, filter, sortLowFirst]);

  const onAddSubmit = (e) => {
    e.preventDefault();
    addProduct({ ...form, precio: Number(form.precio), stock: Number(form.stock), minimo: Number(form.minimo) });
    setForm({ nombre: "", sku: "", categoria: "", precio: "", precioOferta: 0, stock: "", minimo: "" });
    setShowAdd(false);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEdit({ ...p });
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>📦 Inventario</h1>
        {stockAlertsCount > 0 && <span className="alert-pill">⚠️ {stockAlertsCount} stock bajo</span>}
      </div>

      <div className="toolbar">
        <button className="sale-btn-add" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cerrar" : "➕ Nuevo Producto"}
        </button>

        <div className="toolbar-group">
          <label>Buscador</label>
          <input className="sale-input" style={{marginBottom:0}} value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre o SKU..." />
        </div>

        <div className="toolbar-group">
          <label>Ver</label>
          <select className="sale-input" style={{marginBottom:0}} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Todos los activos</option>
            <option value="low">Solo Stock Bajo</option>
            <option value="zero">Sin Stock</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        <label className="sale-label" style={{display:'flex', alignItems:'center', gap: '5px', cursor:'pointer'}}>
          <input type="checkbox" checked={sortLowFirst} onChange={e => setSortLowFirst(e.target.checked)} />
          Alertas arriba
        </label>
      </div>

      {showAdd && (
        <form className="add-form-container" onSubmit={onAddSubmit}>
          <h3 style={{marginTop:0}}>Registrar nuevo producto</h3>
          <div className="form-grid">
            <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required className="sale-input"/>
            <input placeholder="SKU" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required className="sale-input"/>
            <input placeholder="Categoría" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="sale-input"/>
            <input type="number" placeholder="Precio Gs." value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} className="sale-input"/>
            <input type="number" placeholder="Stock Inicial" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="sale-input"/>
            <input type="number" placeholder="Mínimo Alerta" value={form.minimo} onChange={e => setForm({...form, minimo: e.target.value})} className="sale-input"/>
          </div>
          <button type="submit" className="btn-confirm" style={{marginTop:'10px'}}>GUARDAR PRODUCTO</button>
        </form>
      )}

      <table className="inventory-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio</th>
            <th>Oferta</th>
            <th>Stock</th>
            <th>Mínimo</th>
            <th>Estado</th>
            <th>Carga</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {visibleProducts.map(p => {
            const isEditing = editingId === p.id;
            const isLow = p.active && p.stock <= p.minimo;
            const isZero = p.active && p.stock === 0;

            return (
              <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5 }}>
                <td>
                  {isEditing ? <input className="edit-input" value={edit.nombre} onChange={e => setEdit({...edit, nombre: e.target.value})}/> : <strong>{p.nombre}</strong>}
                  <br/><small style={{color: '#888'}}>{p.categoria} | {p.sku}</small>
                </td>
                <td>{isEditing ? <input type="number" className="edit-input" value={edit.precio} onChange={e => setEdit({...edit, precio: e.target.value})}/> : money(p.precio)}</td>
                <td>
                   {isEditing ? <input type="number" className="edit-input" style={{borderColor: '#28a745'}} value={edit.precioOferta} onChange={e => setEdit({...edit, precioOferta: e.target.value})}/> : (p.precioOferta > 0 ? <span style={{color: '#28a745', fontWeight:'bold'}}>{money(p.precioOferta)}</span> : '-')}
                </td>
                <td style={{textAlign:'center'}}>
                   <span className={`stock-badge ${isZero ? 'stock-zero' : isLow ? 'stock-low' : 'stock-ok'}`}>
                     {p.stock}
                   </span>
                </td>
                <td>{isEditing ? <input type="number" className="edit-input" value={edit.minimo} onChange={e => setEdit({...edit, minimo: e.target.value})}/> : p.minimo}</td>
                <td>{p.active ? (isLow ? "⚠️ Reponer" : "✅ Ok") : "🚫 Inactivo"}</td>
                <td>
                  <div className="stock-add-group">
                    <input type="number" placeholder="+" value={stockIn[p.id] || ""} onChange={e => setStockIn({...stockIn, [p.id]: e.target.value})} />
                    <button onClick={() => { addStock(p.id, Number(stockIn[p.id])); setStockIn({...stockIn, [p.id]: ""}); }}>OK</button>
                  </div>
                </td>
                <td>
                  <div style={{display:'flex', gap:'5px'}}>
                    {isEditing ? (
                      <button className="btn btn-primary btn-small" onClick={() => { updateProduct(p.id, edit); setEditingId(null); }}>💾</button>
                    ) : (
                      <button className="btn btn-outline btn-small" onClick={() => startEdit(p)}>📝</button>
                    )}
                    <button className="btn btn-outline btn-small" onClick={() => p.active ? deactivateProduct(p.id) : activateProduct(p.id)}>
                      {p.active ? "🔒" : "🔓"}
                    </button>
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