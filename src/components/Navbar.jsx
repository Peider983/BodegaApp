
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBodega } from '../store/BodegaContext'; // Ajusta la ruta según tu proyecto

const Navbar = () => {
  const { user, logout } = useBodega();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
      logout();
      navigate("/"); // Te manda al login
    }
  };

  return (
    <nav style={navStyle}>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <Link to="/" style={linkStyle}>🏠 Inicio</Link>
        <Link to="/venta" style={linkStyle}>💰 Venta</Link>
        <Link to="/inventario" style={linkStyle}>📦 Inventario</Link>
        
        {/* Solo el Admin ve estos links */}
        {user?.role === 'admin' && (
          <>
            <Link to="/productos" style={linkStyle}>📝 Productos</Link>
            <Link to="/reportes" style={linkStyle}>📊 Reportes</Link>
            <Link to="/usuarios" style={linkStyle}>👥 Usuarios</Link>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={userBadge}>
          <small style={{ display: 'block', fontSize: '10px', color: '#666' }}>
            {user?.role.toUpperCase()}
          </small>
          <strong>{user?.nombre}</strong>
        </div>
        
        <button onClick={handleLogout} style={logoutBtnStyle}>
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};

// --- ESTILOS RÁPIDOS ---
const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 20px',
  background: '#fff',
  borderBottom: '1px solid #ddd',
  alignItems: 'center'
};

const linkStyle = { textDecoration: 'none', color: '#333', fontWeight: '500' };

const userBadge = {
  textAlign: 'right',
  borderRight: '1px solid #ddd',
  paddingRight: '15px'
};

const logoutBtnStyle = {
  background: '#dc3545',
  color: 'white',
  border: 'none',
  padding: '8px 15px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 'bold'
};

export default Navbar;