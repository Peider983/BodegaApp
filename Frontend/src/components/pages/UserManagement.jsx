import React, { useState } from 'react';
import { useBodega } from '../../store/BodegaContext';

const UserManagement = () => {
  const { users, addUser, deleteUser, updateUser } = useBodega();
  const [nuevo, setNuevo] = useState({ username: '', password: '', role: 'almacenista', nombre: '' });

  const handleCrear = (e) => {
    e.preventDefault();
    if (!nuevo.username || !nuevo.password || !nuevo.nombre) return alert("Completa todos los campos");
    addUser(nuevo);
    setNuevo({ username: '', password: '', role: 'almacenista', nombre: '' });
  };

  // ✅ Función para resetear contraseña
  const handleResetPassword = (id) => {
    const newPass = prompt("Ingresa la nueva contraseña para este usuario:");
    if (newPass && newPass.trim().length > 0) {
      updateUser(id, { password: newPass });
      alert("Contraseña actualizada con éxito");
    }
  };

  // ✅ Función para cambiar rol rápidamente
  const toggleRole = (id, currentRole) => {
    if (id === 1) return alert("No puedes cambiar el rol al administrador principal");
    const newRole = currentRole === 'admin' ? 'almacenista' : 'admin';
    updateUser(id, { role: newRole });
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>👥 Gestión de Personal</h1>
      
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* FORMULARIO DE CREACIÓN */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Crear Nuevo Usuario</h3>
          <form onSubmit={handleCrear}>
            <label style={labelS}>Nombre Completo</label>
            <input style={inputS} type="text" placeholder="Ej: Juan Pérez" value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})} />
            
            <label style={labelS}>Usuario de acceso</label>
            <input style={inputS} type="text" placeholder="Ej: juan.perez" value={nuevo.username} onChange={e => setNuevo({...nuevo, username: e.target.value})} />
            
            <label style={labelS}>Contraseña Inicial</label>
            <input style={inputS} type="password" placeholder="••••••••" value={nuevo.password} onChange={e => setNuevo({...nuevo, password: e.target.value})} />
            
            <label style={labelS}>Asignar Rol</label>
            <select style={inputS} value={nuevo.role} onChange={e => setNuevo({...nuevo, role: e.target.value})}>
              <option value="almacenista">Almacenista (Ventas y Stock)</option>
              <option value="admin">Administrador (Acceso Total)</option>
            </select>
            
            <button style={{ ...btnS, background: '#28a745', marginTop: '10px' }}>
              ➕ Guardar Usuario
            </button>
          </form>
        </div>

        {/* LISTA DE USUARIOS */}
        <div style={{ flex: 2, minWidth: '400px' }}>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Usuarios Activos</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={thS}>Nombre / Usuario</th>
                  <th style={thS}>Rol</th>
                  <th style={thS}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td style={tdS}>
                      <div style={{ fontWeight: 'bold' }}>{u.nombre}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>@{u.username}</div>
                    </td>
                    <td style={tdS}>
                      <button 
                        onClick={() => toggleRole(u.id, u.role)}
                        title="Click para cambiar rol"
                        style={{ 
                          ...badgeS, 
                          background: u.role === 'admin' ? '#fff3cd' : '#e2e3e5',
                          color: u.role === 'admin' ? '#856404' : '#383d41',
                          cursor: u.id === 1 ? 'default' : 'pointer'
                        }}>
                        {u.role.toUpperCase()}
                      </button>
                    </td>
                    <td style={tdS}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={() => handleResetPassword(u.id)} 
                          style={btnActionS}
                          title="Resetear contraseña"
                        >
                          🔑 Reset
                        </button>
                        
                        {u.id !== 1 && (
                          <button 
                            onClick={() => deleteUser(u.id)} 
                            style={{ ...btnActionS, color: '#dc3545' }}
                          >
                            🗑️ Borrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- ESTILOS ---
const cardStyle = { 
  flex: 1, 
  minWidth: '300px', 
  background: '#fff', 
  padding: '25px', 
  borderRadius: '12px', 
  boxShadow: '0 4px 15px rgba(0,0,0,0.08)' 
};

const labelS = { display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#555' };

const inputS = { 
  width: '100%', 
  padding: '12px', 
  marginBottom: '15px', 
  borderRadius: '8px', 
  border: '1px solid #ddd',
  boxSizing: 'border-box'
};

const btnS = { 
  width: '100%', 
  padding: '12px', 
  color: '#fff', 
  border: 'none', 
  borderRadius: '8px', 
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '15px'
};

const thS = { padding: '15px 10px', textAlign: 'left', color: '#888', fontSize: '13px' };
const tdS = { padding: '15px 10px' };

const badgeS = { 
  padding: '4px 10px', 
  borderRadius: '6px', 
  fontSize: '11px', 
  fontWeight: 'bold', 
  border: 'none' 
};

const btnActionS = { 
  background: 'none', 
  border: '1px solid #ddd', 
  padding: '5px 10px', 
  borderRadius: '6px', 
  cursor: 'pointer',
  fontSize: '12px',
  color: '#555'
};

export default UserManagement;