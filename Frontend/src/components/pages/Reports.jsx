import React from 'react';
import { useBodega } from '../../store/BodegaContext';
import './Reports.css';

const Reports = () => {
  const { products, movements } = useBodega();

  const lowStockProducts = products.filter(p => p.active && p.stock <= p.minimo);
  const activeProducts = products.filter(p => p.active);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('es-PY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const money = (v) => new Intl.NumberFormat("es-PY", { 
    style: "currency", currency: "PYG", minimumFractionDigits: 0 
  }).format(v || 0);

  return (
    <div className="reports-container">
      <h1 className="reports-title">📊 Reportes de Control</h1>

      {/* --- SECCIÓN 1: ALERTAS DE REPOSICIÓN --- */}
      <section className="report-section section-alert">
        <div className="section-header">
          <h2 className="alert-title">⚠️ Alertas de Reposición (Bajo Stock)</h2>
          <span className="type-badge type-salida">{lowStockProducts.length} Productos</span>
        </div>
        
        {lowStockProducts.length === 0 ? (
          <div className="empty-state">✅ Todo el stock está por encima del mínimo.</div>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Stock Actual</th>
                <th>Mínimo</th>
                <th>Faltante</th>
              </tr>
            </thead>
            <tbody>
              {lowStockProducts.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.nombre}</strong></td>
                  <td><code>{p.sku}</code></td>
                  <td style={{ color: '#e53e3e', fontWeight: 'bold' }}>{p.stock}</td>
                  <td>{p.minimo}</td>
                  <td><span className="type-badge type-salida">-{p.minimo - p.stock}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* --- SECCIÓN 2: ESTADO ACTUAL DEL INVENTARIO --- */}
      <section className="report-section">
        <div className="section-header">
          <h2>📦 Valorización de Inventario</h2>
        </div>
        <table className="report-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Producto</th>
              <th>Precio Venta</th>
              <th>Stock</th>
              <th>Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {activeProducts.map(p => (
              <tr key={p.id}>
                <td>{p.categoria || 'Sin Categoría'}</td>
                <td>{p.nombre}</td>
                <td>{money(p.precio)}</td>
                <td>{p.stock}</td>
                <td><strong>{money(p.precio * p.stock)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* --- SECCIÓN 3: REPORTE DE MOVIMIENTOS --- */}
      <section className="report-section">
        <div className="section-header">
          <h2>🔄 Historial de Movimientos</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Cant.</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No hay movimientos registrados.</td></tr>
              ) : (
                [...movements].reverse().map(m => {
                  const prod = products.find(p => p.id === m.productId);
                  return (
                    <tr key={m.id}>
                      <td>{formatDate(m.date)}</td>
                      <td>{prod ? prod.nombre : 'Producto eliminado'}</td>
                      <td>
                        <span className={`type-badge type-${m.type}`}>
                          {m.type.toUpperCase()}
                        </span>
                      </td>
                      <td>{m.reason}</td>
                      <td><strong>{m.qty}</strong></td>
                      <td style={{ fontSize: '12px', color: '#718096' }}>{m.note}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Reports;