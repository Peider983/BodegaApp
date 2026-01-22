import React, { useState } from 'react';
import { useBodega } from '../../store/BodegaContext';

const Login = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const { login } = useBodega();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!login(form.username, form.password)) {
      alert("Credenciales incorrectas");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
      <form onSubmit={handleSubmit} style={loginBoxStyle}>
        <h2>BODEGA BARATOTE</h2>
        <input 
          type="text" 
          placeholder="Usuario" 
          onChange={e => setForm({...form, username: e.target.value})}
          style={inputStyle}
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          onChange={e => setForm({...form, password: e.target.value})}
          style={inputStyle}
        />
        <button type="submit" style={btnStyle}>Ingresar</button>
      </form>
    </div>
  );
};

const loginBoxStyle = { padding: '40px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center' };
const inputStyle = { display: 'block', width: '100%', marginBottom: '15px', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' };
const btnStyle = { width: '100%', padding: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' };

export default Login;