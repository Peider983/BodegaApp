import React, { useState } from "react";
import { useBodega } from "../../store/BodegaContext";

export default function InventoryLog() {
  const { products, addStock, movements } = useBodega();
  const [form, setForm] = useState({
    productId: "",
    type: "entrada",
    reason: "proveedor",
    qty: "",
    provider: "", // <-- Nuevo campo
    note: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = Number(form.qty);
    if (!form.productId || qty <= 0) return alert("Selecciona un producto y cantidad válida");

    const finalQty = form.type === "salida" ? -qty : qty;
    
    // Enviamos el proveedor dentro de la nota o como campo extra
    const detailNote = form.type === "entrada" 
      ? `Prov: ${form.provider} | ${form.note}` 
      : form.note;

    addStock(form.productId, finalQty, {
      type: form.type,
      reason: form.reason,
      note: detailNote,
      date: new Date().toISOString()
    });

    alert("Movimiento registrado correctamente");
    setForm({ productId: "", type: "entrada", reason: "proveedor", qty: "", provider: "", note: "" });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Gestión de Inventario</h1>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.grid}>
          <label>Producto
            <select value={form.productId} onChange={e => setForm({...form, productId: e.target.value})} required>
              <option value="">Seleccionar...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>)}
            </select>
          </label>

          <label>Tipo de Movimiento
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value, reason: e.target.value === "entrada" ? "proveedor" : "merma"})}>
              <option value="entrada">Entrada (Compra/Ajuste +)</option>
              <option value="salida">Salida (Merma/Ajuste -)</option>
            </select>
          </label>

          <label>Motivo
            <select value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}>
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
          </label>

          <label>Cantidad
            <input type="number" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} required />
          </label>

          {/* Campo condicional para el Proveedor */}
          {form.type === "entrada" && (
            <label>Proveedor / Origen
              <input 
                type="text" 
                value={form.provider} 
                onChange={e => setForm({...form, provider: e.target.value})} 
                placeholder="Ej: Distribuidora X / Coca Cola"
              />
            </label>
          )}

          <label>Notas adicionales
            <input type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Ej: Factura 001-234" />
          </label>
        </div>

        <button type="submit" style={styles.submitBtn}>Registrar Movimiento</button>
      </form>

      <div style={{ marginTop: "40px" }}>
        <h3>Historial de Movimientos</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Motivo</th>
              <th>Cant.</th>
              <th>Detalles / Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(m => {
              const p = products.find(x => x.id === m.productId);
              return (
                <tr key={m.id}>
                  <td>{new Date(m.date).toLocaleDateString()}</td>
                  <td>{p?.nombre}</td>
                  <td style={{ color: m.type === "entrada" ? "green" : "red" }}>{m.type.toUpperCase()}</td>
                  <td>{m.reason}</td>
                  <td>{m.qty}</td>
                  <td>{m.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  form: { background: "#f4f4f4", padding: "20px", borderRadius: "8px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" },
  submitBtn: { marginTop: "20px", padding: "10px 20px", background: "#2ecc71", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }
};