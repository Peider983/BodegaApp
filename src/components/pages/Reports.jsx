import React from 'react';
import { useBodega } from '../../store/BodegaContext';

const Reports = () => {
  const { products, movements } = useBodega();

  // Filtrar productos con bajo stock
  const lowStockProducts = products.filter(p => p.active && p.stock <= p.minimo);

  // Función para formatear fechas
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Reportes de Control</h1>

      <hr />

      {/* --- SECCIÓN 1: ALERTAS DE REPOSICIÓN --- */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#d9534f' }}>⚠️ Alertas de Reposición (Bajo Stock)</h2>
        {lowStockProducts.length === 0 ? (
          <p>✅ Todo el stock está por encima del mínimo.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#f2dede' }}>
                <th style={thStyle}>Producto</th>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Stock Actual</th>
                <th style={thStyle}>Mínimo</th>
                <th style={thStyle}>Faltante</th>
              </tr>
            </thead>
            <tbody>
              {lowStockProducts.map(p => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.nombre}</td>
                  <td style={tdStyle}>{p.sku}</td>
                  <td style={{ ...tdStyle, color: 'red', fontWeight: 'bold' }}>{p.stock}</td>
                  <td style={tdStyle}>{p.minimo}</td>
                  <td style={tdStyle}>{p.minimo - p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* --- SECCIÓN 2: ESTADO ACTUAL DEL INVENTARIO --- */}
      <section style={{ marginBottom: '40px' }}>
        <h2>📦 Estado Actual del Inventario</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={thStyle}>Categoría</th>
              <th style={thStyle}>Producto</th>
              <th style={thStyle}>Precio Venta</th>
              <th style={thStyle}>Stock Disponible</th>
              <th style={thStyle}>Valorizado (Gs.)</th>
            </tr>
          </thead>
          <tbody>
            {products.filter(p => p.active).map(p => (
              <tr key={p.id}>
                <td style={tdStyle}>{p.categoria}</td>
                <td style={tdStyle}>{p.nombre}</td>
                <td style={tdStyle}>Gs. {p.precio.toLocaleString()}</td>
                <td style={tdStyle}>{p.stock}</td>
                <td style={tdStyle}>Gs. {(p.precio * p.stock).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* --- SECCIÓN 3: REPORTE DE MOVIMIENTOS --- */}
      <section>
        <h2>🔄 Historial de Movimientos Detallado</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#e9ecef' }}>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>Producto</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Motivo</th>
              <th style={thStyle}>Cant.</th>
              <th style={thStyle}>Notas/Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '10px' }}>No hay movimientos registrados.</td></tr>
            ) : (
              movements.map(m => {
                const prod = products.find(p => p.id === m.productId);
                return (
                  <tr key={m.id}>
                    <td style={tdStyle}>{formatDate(m.date)}</td>
                    <td style={tdStyle}>{prod ? prod.nombre : 'Producto eliminado'}</td>
                    <td style={{ ...tdStyle, color: m.type === 'entrada' ? 'green' : 'red', fontWeight: 'bold' }}>
                      {m.type.toUpperCase()}
                    </td>
                    <td style={tdStyle}>{m.reason}</td>
                    <td style={tdStyle}>{m.qty}</td>
                    <td style={tdStyle}>{m.note}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

// Estilos rápidos para las tablas
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '10px' };
const thStyle = { border: '1px solid #ddd', padding: '12px', textAlign: 'left' };
const tdStyle = { border: '1px solid #ddd', padding: '10px' };

export default Reports;