import React, { useContext } from 'react';
import { BodegaContext } from '../../store/BodegaContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  // Consumimos el contexto. Usamos nombres exactos: products y sales
  const context = useContext(BodegaContext);
  
  if (!context) return <p>Cargando datos...</p>;

  const { products = [], sales = [] } = context;

  // --- LÓGICA DE KPIs ---
  const hoy = new Date().toLocaleDateString();
  
  // 1. Ventas de hoy (comparando la fecha formateada)
  const ventasHoy = sales.filter(v => {
    const fechaVenta = new Date(v.createdAt).toLocaleDateString();
    return fechaVenta === hoy;
  });
  
  const totalGsHoy = ventasHoy.reduce((acc, v) => acc + (v.total || 0), 0);

  // 2. Alertas de Stock
  const productosBajoStock = products.filter(p => 
    p.active !== false && Number(p.stock) <= Number(p.minimo)
  ).length;

  // --- LÓGICA DE GRÁFICA (Últimos 7 días) ---
  const etiquetasDias = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString();
  });

  const datosVentasDias = etiquetasDias.map(fechaLabel => {
    return sales
      .filter(v => new Date(v.createdAt).toLocaleDateString() === fechaLabel)
      .reduce((acc, v) => acc + (v.total || 0), 0);
  });

  const dataGrafica = {
    labels: etiquetasDias,
    datasets: [
      {
        label: 'Ventas Diarias (Gs.)',
        data: datosVentasDias,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderRadius: 5,
      },
    ],
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa' }}>
      <h1>Inicio</h1>
      <p style={{ color: '#666' }}>Resumen general de Bodega Baratote</p>

      {/* TARJETAS KPI */}
      <div style={gridStyle}>
        <div style={{ ...cardStyle, borderTop: '5px solid #28a745' }}>
          <span style={labelStyle}>VENTAS HOY</span>
          <div style={valueStyle}>Gs. {totalGsHoy.toLocaleString()}</div>
          <small>{ventasHoy.length} transacciones</small>
        </div>

        <div style={{ ...cardStyle, borderTop: '5px solid #dc3545' }}>
          <span style={labelStyle}>ALERTAS STOCK</span>
          <div style={{ ...valueStyle, color: '#dc3545' }}>{productosBajoStock}</div>
          <small>Productos críticos</small>
        </div>

        <div style={{ ...cardStyle, borderTop: '5px solid #007bff' }}>
          <span style={labelStyle}>PRODUCTOS</span>
          <div style={valueStyle}>{products.length}</div>
          <small>En catálogo</small>
        </div>
      </div>

      {/* GRÁFICA */}
      <div style={chartContainerStyle}>
        <h3 style={{ marginBottom: '15px' }}>Ventas de la Semana</h3>
        <div style={{ height: '300px' }}>
          <Bar 
            data={dataGrafica} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: { legend: { display: false } }
            }} 
          />
        </div>
      </div>
    </div>
  );
};

// Estilos
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '20px',
  marginTop: '20px'
};

const cardStyle = {
  backgroundColor: '#fff',
  padding: '15px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column'
};

const chartContainerStyle = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '8px',
  marginTop: '30px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};

const labelStyle = { fontSize: '0.7rem', color: '#888', fontWeight: 'bold' };
const valueStyle = { fontSize: '1.5rem', fontWeight: 'bold', margin: '5px 0' };

export default Dashboard;