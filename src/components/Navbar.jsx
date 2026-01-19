import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="brand">BODEGA BARATOTE</div>
      <nav className="navlinks">
        <NavLink to="/" end>Inicio</NavLink>
        <NavLink to="/productos">Productos</NavLink>
        <NavLink to="/venta">Nueva venta</NavLink>
        <NavLink to="/inventario">Inventario</NavLink> {/* Agrega esta línea */}
        <NavLink to="/resumen-dia">Resumen del día</NavLink>
      </nav>
    </header>
  );
}
