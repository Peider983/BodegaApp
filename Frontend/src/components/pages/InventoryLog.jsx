
import React, { useState } from "react";
import { useBodega } from "../../store/BodegaContext";
import "./InventoryLog.css"; //  Importamos el nuevo CSS

export default function InventoryLog() {
  const { products, addStock, movements } = useBodega();
  const [form, setForm] = useState({
    productId: "",
    type: "entrada",
    reason: "proveedor",
    qty: "",
    provider: "",
    note: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = Number(form.qty);
    if (!form.productId || qty <= 0) return alert("Selecciona un producto y cantidad válida");

    const finalQty = form.type === "salida" ? -qty : qty;
    const detailNote = form.type === "entrada" 
      ? `Prov: ${form.provider} | ${form.note}` 
      : form.note;

    addStock(form.productId, finalQty, {
      type: form.type,
      reason: form.reason,
      note: detailNote,
      date: new Date().toISOString()
    });

    alert("Movimiento registrado con éxito");
    setForm({ productId: "", type: "entrada", reason: "proveedor", qty: "", provider: "", note: "" });
  };

  return (
    <div className="inventory-log-container">
      <h1> Gestión de Inventario</h1>
      
      <div className={`log-card ${form.type}`}>
        <h3 style={{marginTop: 0, color: form.type === 'entrada' ? '#27ae60' : '#c0392b'}}>
          Nuevo Registro de {form.type === 'entrada' ? 'Entrada' : 'Salida'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="log-form-grid">
            <div className="log-field">
              <label>Producto</label>
              <select className="sale-input" value={form.productId} onChange={e => setForm({...form, productId: e.target.value})} required>
                <option value="">Seleccionar producto...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.nombre} (Actual: {p.stock})</option>)}
              </select>
            </div>

            <div className="log-field">
              <label>Tipo de Movimiento</label>
              <select className="sale-input" value={form.type} onChange={e => setForm({...form, type: e.target.value, reason: e.target.value === "entrada" ? "proveedor" : "merma"})}>
                <option value="entrada">➕ Entrada (Compra/Ajuste)</option>
                <option value="salida">➖ Salida (Merma/Rotura)</option>
              </select>
            </div>

            <div className="log-field">
              <label>Motivo</label>
              <select className="sale-input" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}>
                {form.type === "entrada" ? (
                  <>
                    <option value="proveedor">Compra a Proveedor</option>
                    <option value="conteo">Ajuste por Conteo</option>
                  </>
                ) : (
                  <>
                    <option value="merma">Merma / Vencimiento</option>
                    <option value="rotura">Rotura</option>
                    <option value="conteo">Ajuste por Conteo</option>
                  </>
                )}
              </select>
            </div>

            <div className="log-field">
              <label>Cantidad</label>
              <input className="sale-input" type="number" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} placeholder="0" required />
            </div>

            {form.type === "entrada" && (
              <div className="log-field">
                <label>Proveedor</label>
                <input className="sale-input" type="text" value={form.provider} onChange={e => setForm({...form, provider: e.target.value})} placeholder="Ej: Coca Cola S.A." />
              </div>
            )}

            <div className="log-field">
              <label>Notas / Factura</label>
              <input className="sale-input" type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Opcional..." />
            </div>
          </div>

          <button type="submit" className={`btn-inventory ${form.type === 'entrada' ? 'btn-entrada' : 'btn-salida'}`}>
            REGISTRAR {form.type.toUpperCase()}
          </button>
        </form>
      </div>

      <div className="history-section">
        <h3>Historial de Movimientos</h3>
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Motivo</th>
              <th>Cant.</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {[...movements].reverse().slice(0, 15).map(m => {
              const p = products.find(x => x.id === m.productId);
              return (
                <tr key={m.id}>
                  <td>{new Date(m.date).toLocaleDateString()}</td>
                  <td><strong>{p?.nombre}</strong></td>
                  <td>
                    <span className={`badge-type badge-${m.type}`}>
                      {m.type.toUpperCase()}
                    </span>
                  </td>
                  <td>{m.reason}</td>
                  <td style={{ fontWeight: 'bold' }}>{m.qty}</td>
                  <td className="note-text" title={m.note}>{m.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}