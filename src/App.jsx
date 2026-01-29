import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useBodega } from "./store/BodegaContext";
import "./styles/App.css"; // 🔥 IMPORTAMOS EL CSS AQUÍ

// Componentes de Estructura
import Layout from "./components/Layout";
import Login from "./components/pages/Login";
import UserManagement from "./components/pages/UserManagement";
// Páginas
import Dashboard from "./components/pages/Dashboard";
import Products from "./components/pages/Products";
import NewSale from "./components/pages/NewSale";
import DaySummary from "./components/pages/DaySummary";
import InventoryLog from "./components/pages/InventoryLog";
import Reports from "./components/pages/Reports";

export default function App() {
  const { user } = useBodega();

  // Si el usuario no ha iniciado sesión, solo mostramos la pantalla de Login
  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      {/* Usamos el Layout para envolver todas las rutas protegidas */}
      <Route element={<Layout />}>
        
        {/* RUTAS PÚBLICAS (Para Admin y Almacenista) */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/venta" element={<NewSale />} />
        <Route path="/inventario" element={<InventoryLog />} />
        <Route path="/resumen-dia" element={<DaySummary />} />

        {/* RUTAS PROTEGIDAS (Solo Administrador) */}
        {user.role === "admin" && (
          <>
            <Route path="/productos" element={<Products />} />
            <Route path="/reportes" element={<Reports />} />
            <Route path="/resumen-dia" element={<DaySummary />} />
            <Route path="/usuarios" element={<UserManagement />} /> {/* <--- NUEVA RUTA */}
          </>
        )}

        {/* Redirección automática si la ruta no existe o no tiene permisos */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}