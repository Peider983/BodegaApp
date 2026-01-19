import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

import Dashboard from "./components/pages/Dashboard";
import Products from "./components/pages/Products";
import NewSale from "./components/pages/NewSale";
import DaySummary from "./components/pages/DaySummary";
import InventoryLog from "./components/pages/InventoryLog"; // 1. Importa el nuevo componente

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/productos" element={<Products />} />
        <Route path="/venta" element={<NewSale />} />
        <Route path="/resumen-dia" element={<DaySummary />} />
        {/* 2. Registra la nueva ruta para Inventario */}
        <Route path="/inventario" element={<InventoryLog />} /> 
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}