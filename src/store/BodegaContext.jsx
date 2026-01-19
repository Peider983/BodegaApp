/*
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

const BodegaContext = createContext(null);

const initialProducts = [
  {
    id: 1,
    nombre: "Coca Cola 500ml",
    sku: "COCA-500",
    categoria: "Bebidas",
    descripcion: "",
    precio: 1200,
    stock: 18,
    minimo: 20,
    active: true,
  },
  {
    id: 2,
    nombre: "Hielo bolsa",
    sku: "HIELO-BOLSA",
    categoria: "Hielo",
    descripcion: "",
    precio: 1500,
    stock: 40,
    minimo: 15,
    active: true,
  },
  {
    id: 3,
    nombre: "Caramelos surtidos",
    sku: "CARA-SURT",
    categoria: "Caramelos",
    descripcion: "",
    precio: 100,
    stock: 200,
    minimo: 50,
    active: true,
  },
];

const STORAGE_KEY = "bodega_v2";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no rompemos la app
  }
}

function normalizeSku(sku) {
  return String(sku || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

export function BodegaProvider({ children }) {
  const saved = loadState();

  const [products, setProducts] = useState(saved?.products ?? initialProducts);
  const [sales, setSales] = useState(saved?.sales ?? []);
  const [days, setDays] = useState(saved?.days ?? []);

  // ✅ persistencia automática
  useEffect(() => {
    saveState({ products, sales, days });
  }, [products, sales, days]);

  // ✅ vender
  const sell = ({ productId, qty, paymentMethod = "efectivo" }) => {
    const id = Number(productId);
    const q = Number(qty);

    const p = products.find((x) => x.id === id);
    if (!p) return alert("Producto no encontrado");
    if (p.active === false) return alert("Producto inactivo");
    if (!Number.isFinite(q) || q <= 0) return alert("Cantidad inválida");
    if (q > Number(p.stock ?? 0)) return alert("No hay stock suficiente");

    setProducts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, stock: Number(x.stock ?? 0) - q } : x))
    );

    const total = Number(p.precio ?? 0) * q;

    const sale = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      productId: p.id,
      nombre: p.nombre,
      sku: p.sku ?? "",
      categoria: p.categoria ?? "",
      qty: q,
      precio: Number(p.precio ?? 0),
      total,
      paymentMethod,
      createdAt: new Date().toISOString(),
    };

    setSales((prev) => [sale, ...prev]);
  };

  // ✅ anular venta
  const cancelSale = (saleId) => {
    setSales((prevSales) => {
      const sale = prevSales.find((s) => s.id === saleId);
      if (!sale) return prevSales;

      const msg =
        `¿Anular venta?\n\n` +
        `Producto: ${sale.nombre}\n` +
        `Cantidad: ${sale.qty}\n` +
        `Precio: ${sale.precio}\n` +
        `Total: ${sale.total}`;

      if (!confirm(msg)) return prevSales;

      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === sale.productId
            ? { ...p, stock: Number(p.stock ?? 0) + Number(sale.qty ?? 0) }
            : p
        )
      );

      return prevSales.filter((s) => s.id !== saleId);
    });
  };

  // ✅ agregar producto
  const addProduct = ({
    nombre,
    sku,
    categoria,
    descripcion,
    precio,
    stock,
    minimo,
  }) => {
    const n = String(nombre ?? "").trim();
    if (!n) return alert("Nombre requerido");

    const sk = normalizeSku(sku);
    if (!sk) return alert("SKU requerido");

    const skuExists = products.some((p) => normalizeSku(p.sku) === sk);
    if (skuExists) return alert("SKU ya existe (debe ser único)");

    const pr = Number(precio);
    const st = Number(stock);
    const mi = Number(minimo);

    if (!Number.isFinite(pr) || pr < 0) return alert("Precio inválido");
    if (!Number.isFinite(st) || st < 0) return alert("Stock inválido");
    if (!Number.isFinite(mi) || mi < 0) return alert("Mínimo inválido");

    const newP = {
      id: Date.now(),
      nombre: n,
      sku: sk,
      categoria: String(categoria ?? "").trim(),
      descripcion: String(descripcion ?? "").trim(),
      precio: pr,
      stock: st,
      minimo: mi,
      active: true,
    };

    setProducts((prev) => [newP, ...prev]);
  };

  // ✅ editar producto (valida SKU si se cambia)
  const updateProduct = (id, patch) => {
    const pid = Number(id);

    setProducts((prev) => {
      const current = prev.find((p) => p.id === pid);
      if (!current) return prev;

      let nextPatch = { ...patch };

      // si viene sku, validar
      if (nextPatch?.sku != null) {
        const newSku = normalizeSku(nextPatch.sku);
        if (!newSku) {
          alert("SKU inválido");
          return prev;
        }
        const exists = prev.some(
          (p) => p.id !== pid && normalizeSku(p.sku) === newSku
        );
        if (exists) {
          alert("SKU ya existe (debe ser único)");
          return prev;
        }
        nextPatch.sku = newSku;
      }

      return prev.map((p) => (p.id === pid ? { ...p, ...nextPatch } : p));
    });
  };

  // ✅ “eliminar” recomendado: desactivar
  const deactivateProduct = (id) => updateProduct(id, { active: false });
  const activateProduct = (id) => updateProduct(id, { active: true });

  // ✅ entrada de stock
  const addStock = (id, qty) => {
    const pid = Number(id);
    const q = Number(qty);

    if (!Number.isFinite(q) || q <= 0) return alert("Cantidad inválida");

    setProducts((prev) =>
      prev.map((p) =>
        p.id === pid ? { ...p, stock: Number(p.stock ?? 0) + q } : p
      )
    );
  };

  // ✅ resumen (del estado actual)
  const summary = useMemo(() => {
    const ventas = sales.length;
    const total = sales.reduce((acc, s) => acc + Number(s.total ?? 0), 0);

    const byPayment = sales.reduce(
      (acc, s) => {
        const key = (s.paymentMethod || "efectivo").toLowerCase();
        acc[key] = (acc[key] || 0) + Number(s.total ?? 0);
        return acc;
      },
      { efectivo: 0, transferencia: 0, tarjeta: 0 }
    );

    const map = new Map();
    for (const s of sales) {
      map.set(s.nombre, (map.get(s.nombre) || 0) + Number(s.qty ?? 0));
    }

    const top = [...map.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const alertas = products
      .filter((p) => p.active !== false)
      .filter((p) => Number(p.stock ?? 0) <= Number(p.minimo ?? 0))
      .map((p) => ({ nombre: p.nombre, stock: p.stock, minimo: p.minimo }));

    return { ventas, total, top, alertas, byPayment };
  }, [sales, products]);

  // ✅ CERRAR DÍA
  const closeDay = () => {
    if (sales.length === 0) return alert("No hay ventas para cerrar.");

    const now = new Date();
    const iso = now.toISOString();

    const msg =
      `¿Cerrar día?\n\n` +
      `Ventas: ${summary.ventas}\n` +
      `Total: ${summary.total}\n\n` +
      `Esto guardará el cierre y dejará el día en 0.`;

    if (!confirm(msg)) return;

    const day = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      closedAt: iso,
      ventas: summary.ventas,
      total: summary.total,
      top: summary.top,
      sales: sales,
      byPayment: summary.byPayment,
    };

    setDays((prev) => [day, ...prev]);
    setSales([]);
    alert("Día cerrado ✅");
  };

  const deleteDay = (id) => {
    if (!confirm("¿Eliminar este cierre guardado?")) return;
    setDays((prev) => prev.filter((d) => d.id !== id));
  };

  const resetAll = () => {
    if (!confirm("¿Borrar todos los datos guardados?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setProducts(initialProducts);
    setSales([]);
    setDays([]);
  };

  const value = {
    products,
    sales,
    days,
    sell,
    cancelSale,
    closeDay,
    deleteDay,
    summary,
    addProduct,
    updateProduct,
    addStock,
    deactivateProduct,
    activateProduct,
    resetAll,
  };

  return (
    <BodegaContext.Provider value={value}>
      {children}
    </BodegaContext.Provider>
  );
}

export function useBodega() {
  const ctx = useContext(BodegaContext);
  if (!ctx) throw new Error("useBodega debe usarse dentro de BodegaProvider");
  return ctx;
}
*/
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

const BodegaContext = createContext(null);

const initialProducts = [
  { id: 1, nombre: "Coca Cola 500ml", sku: "COCA-500", categoria: "Bebidas", descripcion: "", precio: 1200, stock: 18, minimo: 20, active: true },
  { id: 2, nombre: "Hielo bolsa", sku: "HIELO-BOLSA", categoria: "Hielo", descripcion: "", precio: 1500, stock: 40, minimo: 15, active: true },
  { id: 3, nombre: "Caramelos surtidos", sku: "CARA-SURT", categoria: "Caramelos", descripcion: "", precio: 100, stock: 200, minimo: 50, active: true },
];

const STORAGE_KEY = "bodega_v2";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { }
}

function normalizeSku(sku) {
  return String(sku || "").trim().toUpperCase().replace(/\s+/g, "-");
}

export function BodegaProvider({ children }) {
  const saved = loadState();

  const [products, setProducts] = useState(saved?.products ?? initialProducts);
  const [sales, setSales] = useState(saved?.sales ?? []);
  const [days, setDays] = useState(saved?.days ?? []);
  // ✅ Nuevo estado para movimientos de inventario
  const [movements, setMovements] = useState(saved?.movements ?? []);

  // ✅ Persistencia automática incluyendo movimientos
  useEffect(() => {
    saveState({ products, sales, days, movements });
  }, [products, sales, days, movements]);

  // ✅ Vender
  const sell = ({ productId, qty, paymentMethod = "efectivo" }) => {
    const id = Number(productId);
    const q = Number(qty);
    const p = products.find((x) => x.id === id);

    if (!p) return alert("Producto no encontrado");
    if (p.active === false) return alert("Producto inactivo");
    if (!Number.isFinite(q) || q <= 0) return alert("Cantidad inválida");
    if (q > Number(p.stock ?? 0)) return alert("No hay stock suficiente");

    setProducts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, stock: Number(x.stock ?? 0) - q } : x))
    );

    const total = Number(p.precio ?? 0) * q;
    const sale = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      productId: p.id,
      nombre: p.nombre,
      sku: p.sku ?? "",
      categoria: p.categoria ?? "",
      qty: q,
      precio: Number(p.precio ?? 0),
      total,
      paymentMethod,
      createdAt: new Date().toISOString(),
    };

    setSales((prev) => [sale, ...prev]);
  };

  // ✅ Anular venta
  const cancelSale = (saleId) => {
    setSales((prevSales) => {
      const sale = prevSales.find((s) => s.id === saleId);
      if (!sale) return prevSales;
      if (!confirm(`¿Anular venta de ${sale.nombre}?`)) return prevSales;

      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === sale.productId
            ? { ...p, stock: Number(p.stock ?? 0) + Number(sale.qty ?? 0) }
            : p
        )
      );
      return prevSales.filter((s) => s.id !== saleId);
    });
  };

  // ✅ Agregar producto
  const addProduct = ({ nombre, sku, categoria, descripcion, precio, stock, minimo }) => {
    const n = String(nombre ?? "").trim();
    const sk = normalizeSku(sku);
    if (!n || !sk) return alert("Nombre y SKU requeridos");

    if (products.some((p) => normalizeSku(p.sku) === sk)) return alert("SKU ya existe");

    const newP = {
      id: Date.now(),
      nombre: n,
      sku: sk,
      categoria: String(categoria ?? "").trim(),
      descripcion: String(descripcion ?? "").trim(),
      precio: Number(precio),
      stock: Number(stock),
      minimo: Number(minimo),
      active: true,
    };
    setProducts((prev) => [newP, ...prev]);
  };

  // ✅ Editar producto
  const updateProduct = (id, patch) => {
    const pid = Number(id);
    setProducts((prev) => {
      const current = prev.find((p) => p.id === pid);
      if (!current) return prev;
      let nextPatch = { ...patch };
      if (nextPatch.sku) {
        const newSku = normalizeSku(nextPatch.sku);
        if (prev.some((p) => p.id !== pid && normalizeSku(p.sku) === newSku)) {
          alert("SKU ya existe");
          return prev;
        }
        nextPatch.sku = newSku;
      }
      return prev.map((p) => (p.id === pid ? { ...p, ...nextPatch } : p));
    });
  };

  const deactivateProduct = (id) => updateProduct(id, { active: false });
  const activateProduct = (id) => updateProduct(id, { active: true });

  // ✅ Función de Stock MEJORADA (Para entradas, salidas y ajustes)
  const addStock = (id, qty, metadata = null) => {
    const pid = Number(id);
    const q = Number(qty); // Puede ser negativo

    setProducts((prev) =>
      prev.map((p) =>
        p.id === pid ? { ...p, stock: Math.max(0, Number(p.stock ?? 0) + q) } : p
      )
    );

    // Si viene con metadata (desde el componente InventoryLog) guardamos el log
    if (metadata) {
      const newMove = {
        id: Date.now(),
        productId: pid,
        qty: Math.abs(q),
        type: metadata.type,     // "entrada" o "salida"
        reason: metadata.reason, // "proveedor", "merma", etc.
        note: metadata.note || "",
        date: metadata.date || new Date().toISOString()
      };
      setMovements(prev => [newMove, ...prev]);
    }
  };

  // ✅ Resumen
  const summary = useMemo(() => {
    const ventas = sales.length;
    const total = sales.reduce((acc, s) => acc + Number(s.total ?? 0), 0);
    const byPayment = sales.reduce((acc, s) => {
      const key = (s.paymentMethod || "efectivo").toLowerCase();
      acc[key] = (acc[key] || 0) + Number(s.total ?? 0);
      return acc;
    }, { efectivo: 0, transferencia: 0, tarjeta: 0 });

    const map = new Map();
    sales.forEach(s => map.set(s.nombre, (map.get(s.nombre) || 0) + Number(s.qty ?? 0)));
    const top = [...map.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);

    const alertas = products.filter(p => p.active !== false && Number(p.stock ?? 0) <= Number(p.minimo ?? 0))
      .map(p => ({ nombre: p.nombre, stock: p.stock, minimo: p.minimo }));

    return { ventas, total, top, alertas, byPayment };
  }, [sales, products]);

  // ✅ Cerrar día
  const closeDay = () => {
    if (sales.length === 0) return alert("No hay ventas para cerrar.");
    if (!confirm(`¿Cerrar día? Total: ${summary.total}`)) return;

    const day = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      closedAt: new Date().toISOString(),
      ventas: summary.ventas,
      total: summary.total,
      top: summary.top,
      sales: sales,
      byPayment: summary.byPayment,
    };

    setDays((prev) => [day, ...prev]);
    setSales([]);
    alert("Día cerrado ✅");
  };

  const deleteDay = (id) => {
    if (confirm("¿Eliminar este cierre?")) setDays((prev) => prev.filter((d) => d.id !== id));
  };

  const resetAll = () => {
    if (confirm("¿Borrar todo?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const value = {
    products,
    sales,
    days,
    movements, // <--- Exportado
    sell,
    cancelSale,
    closeDay,
    deleteDay,
    summary,
    addProduct,
    updateProduct,
    addStock,   // <--- Exportado con la nueva lógica
    deactivateProduct,
    activateProduct,
    resetAll,
  };

  return <BodegaContext.Provider value={value}>{children}</BodegaContext.Provider>;
}

export function useBodega() {
  const ctx = useContext(BodegaContext);
  if (!ctx) throw new Error("useBodega debe usarse dentro de BodegaProvider");
  return ctx;
}