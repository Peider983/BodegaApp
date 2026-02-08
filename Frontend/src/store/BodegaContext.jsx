/*
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

// Creamos el contexto una sola vez al inicio
export const BodegaContext = createContext(null);

const STORAGE_KEY = "bodega_v2";

const initialProducts = [
  { id: 1, nombre: "Coca Cola 500ml", sku: "COCA-500", categoria: "Bebidas", descripcion: "", precio: 1200, precioOferta: 0, stock: 18, minimo: 20, active: true },
  { id: 2, nombre: "Hielo bolsa", sku: "HIELO-BOLSA", categoria: "Hielo", descripcion: "", precio: 1500, precioOferta: 0, stock: 40, minimo: 15, active: true },
  { id: 3, nombre: "Caramelos surtidos", sku: "CARA-SURT", categoria: "Caramelos", descripcion: "", precio: 100, precioOferta: 0, stock: 200, minimo: 50, active: true },
];

// --- HELPERS PARA PERSISTENCIA ---
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

// --- PROVIDER ---
export function BodegaProvider({ children }) {
  const saved = loadState();

  // Estados de Negocio
  const [products, setProducts] = useState(saved?.products ?? initialProducts);
  const [sales, setSales] = useState(saved?.sales ?? []);
  const [days, setDays] = useState(saved?.days ?? []);
  const [movements, setMovements] = useState(saved?.movements ?? []);
  
  // Estados de Usuario y Sesión
  const [user, setUser] = useState(saved?.user ?? null);
  const [users, setUsers] = useState(saved?.users ?? [
    { id: 1, username: "admin", password: "123", role: "admin", nombre: "Administrador" },
    { id: 2, username: "pedro", password: "123", role: "almacenista", nombre: "Pedro Almacén" }
  ]);

  // Persistencia automática
  useEffect(() => {
    saveState({ products, sales, days, movements, user, users });
  }, [products, sales, days, movements, user, users]);

  // --- LÓGICA DE USUARIOS ---
  const login = (username, password) => {
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  const addUser = (newUser) => {
    if (users.some(u => u.username === newUser.username)) return alert("Error: El usuario ya existe.");
    setUsers(prev => [...prev, { ...newUser, id: Date.now() }]);
  };

  const updateUser = (id, patch) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const updated = { ...u, ...patch };
        if (user && user.id === id) setUser(updated);
        return updated;
      }
      return u;
    }));
  };

  const deleteUser = (id) => {
    if (id === 1) return alert("No puedes eliminar al administrador principal.");
    if (confirm("¿Seguro que deseas eliminar este usuario?")) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  // --- LÓGICA DE NEGOCIO ---
  const sell = ({ productId, qty, paymentMethod = "efectivo" }) => {
    const id = Number(productId);
    const q = Number(qty);
    const p = products.find((x) => x.id === id);

    if (!p || p.active === false || q <= 0 || q > Number(p.stock ?? 0)) {
      return alert("Error en venta o stock insuficiente");
    }

    // Precio dinámico: Oferta vs Normal
    const precioAplicado = (p.precioOferta > 0) ? Number(p.precioOferta) : Number(p.precio);
    const total = precioAplicado * q;

    setProducts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, stock: Number(x.stock ?? 0) - q } : x))
    );

    const sale = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now()),
      productId: p.id,
      nombre: p.nombre,
      qty: q,
      precio: precioAplicado,
      total,
      paymentMethod,
      vendedor: user?.nombre || "Sistema",
      createdAt: new Date().toISOString(),
    };

    setSales((prev) => [sale, ...prev]);
  };

  const cancelSale = (saleId) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    if (!confirm(`¿Anular venta de ${sale.nombre}?`)) return;

    setProducts((prev) =>
      prev.map((p) =>
        p.id === sale.productId ? { ...p, stock: Number(p.stock ?? 0) + Number(sale.qty ?? 0) } : p
      )
    );
    setSales((prev) => prev.filter((s) => s.id !== saleId));
  };

  const addProduct = ({ nombre, sku, categoria, descripcion, precio, precioOferta, stock, minimo }) => {
    const sk = normalizeSku(sku);
    if (products.some((p) => normalizeSku(p.sku) === sk)) return alert("SKU ya existe");

    const newP = {
      id: Date.now(),
      nombre: String(nombre ?? "").trim(),
      sku: sk,
      categoria: String(categoria ?? "").trim(),
      descripcion: String(descripcion ?? "").trim(),
      precio: Number(precio || 0),
      precioOferta: Number(precioOferta || 0),
      stock: Number(stock || 0),
      minimo: Number(minimo || 0),
      active: true,
    };
    setProducts((prev) => [newP, ...prev]);
  };

  const updateProduct = (id, patch) => {
    const pid = Number(id);
    setProducts((prev) => {
      if (patch.sku) {
        const newSku = normalizeSku(patch.sku);
        if (prev.some((p) => p.id !== pid && normalizeSku(p.sku) === newSku)) {
          alert("SKU ya existe");
          return prev;
        }
      }
      return prev.map((p) => (p.id === pid ? { ...p, ...patch } : p));
    });
  };

  const deactivateProduct = (id) => updateProduct(id, { active: false });
  const activateProduct = (id) => updateProduct(id, { active: true });

  const addStock = (id, qty, metadata = null) => {
    const pid = Number(id);
    const q = Number(qty);
    setProducts((prev) =>
      prev.map((p) => p.id === pid ? { ...p, stock: Math.max(0, Number(p.stock ?? 0) + q) } : p)
    );

    if (metadata) {
      setMovements(prev => [{
        id: Date.now(),
        productId: pid,
        qty: Math.abs(q),
        responsable: user?.nombre || "Sistema",
        date: new Date().toISOString(),
        ...metadata
      }, ...prev]);
    }
  };

  const summary = useMemo(() => {
    const total = sales.reduce((acc, s) => acc + Number(s.total ?? 0), 0);
    const byPayment = sales.reduce((acc, s) => {
      const key = (s.paymentMethod || "efectivo").toLowerCase();
      acc[key] = (acc[key] || 0) + Number(s.total ?? 0);
      return acc;
    }, { efectivo: 0, transferencia: 0, tarjeta: 0 });

    const alertas = products.filter(p => p.active !== false && Number(p.stock ?? 0) <= Number(p.minimo ?? 0));

    return { ventas: sales.length, total, alertas, byPayment };
  }, [sales, products]);

  const closeDay = () => {
    if (sales.length === 0) return alert("No hay ventas para cerrar.");
    const day = {
      id: Date.now(),
      closedAt: new Date().toISOString(),
      ventas: summary.ventas,
      total: summary.total,
      sales: [...sales],
      byPayment: summary.byPayment,
      encargado: user?.nombre || "Admin"
    };
    setDays((prev) => [day, ...prev]);
    setSales([]);
    alert("Día cerrado ✅");
  };

  const value = {
    user, users, login, logout, addUser, updateUser, deleteUser,
    products, sales, days, movements, summary,
    sell, cancelSale, closeDay, addProduct, updateProduct, addStock,
    deactivateProduct, activateProduct,
    resetAll: () => { if(confirm("¿Borrar todo?")) { localStorage.clear(); window.location.reload(); } }
  };

  return <BodegaContext.Provider value={value}>{children}</BodegaContext.Provider>;
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

// Creamos el contexto una sola vez al inicio
export const BodegaContext = createContext(null);

const STORAGE_KEY = "bodega_v2";

/**
 * ✅ MIGRACIÓN AUTOMÁTICA (sin perder datos)
 * - Carga localStorage
 * - Corrige/crea precios por producto si faltan o están mezclados
 * - Guarda de vuelta ya migrado
 */

const initialProducts = [
  {
    id: 1,
    nombre: "Coca Cola 500ml",
    sku: "COCA-500",
    categoria: "Bebidas",
    descripcion: "",
    precio: 3000,
    precioOferta: 0,
    stock: 18,
    minimo: 20,
    active: true,
    precios: [
      { id: "1-U", tipo: "UNIDAD", cantidad: 1, precio: 3000, activo: true },
      { id: "1-P6", tipo: "PACK", cantidad: 6, precio: 3000 * 6, activo: true },
      { id: "1-P12", tipo: "PACK", cantidad: 12, precio: 3000 * 12, activo: true },
      { id: "1-P15", tipo: "PACK", cantidad: 15, precio: 3000 * 15, activo: true },
    ],
  },
  {
    id: 2,
    nombre: "Hielo bolsa",
    sku: "HIELO-BOLSA",
    categoria: "Hielo",
    descripcion: "",
    precio: 1500,
    precioOferta: 0,
    stock: 40,
    minimo: 15,
    active: true,
    precios: [
      { id: "2-U", tipo: "UNIDAD", cantidad: 1, precio: 1500, activo: true },
      { id: "2-P6", tipo: "PACK", cantidad: 6, precio: 1500 * 6, activo: true },
      { id: "2-P12", tipo: "PACK", cantidad: 12, precio: 1500 * 12, activo: true },
      { id: "2-P15", tipo: "PACK", cantidad: 15, precio: 1500 * 15, activo: true },
    ],
  },
  {
    id: 3,
    nombre: "Caramelos surtidos",
    sku: "CARA-SURT",
    categoria: "Caramelos",
    descripcion: "",
    precio: 100,
    precioOferta: 0,
    stock: 200,
    minimo: 50,
    active: true,
    precios: [
      { id: "3-U", tipo: "UNIDAD", cantidad: 1, precio: 100, activo: true },
      { id: "3-P6", tipo: "PACK", cantidad: 6, precio: 100 * 6, activo: true },
      { id: "3-P12", tipo: "PACK", cantidad: 12, precio: 100 * 12, activo: true },
      { id: "3-P15", tipo: "PACK", cantidad: 15, precio: 100 * 15, activo: true },
    ],
  },
];

// --- HELPERS PARA PERSISTENCIA ---
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function normalizeSku(sku) {
  return String(sku || "").trim().toUpperCase().replace(/\s+/g, "-");
}

// ✅ asegura/ARREGLA que todos los productos tengan "precios" propios (y evita que coca tome precios de hielo)
function ensurePriceList(products) {
  return (products || []).map((p) => {
    const base = Number(p.precio || 0);
    const pid = String(p.id);

    const old = Array.isArray(p.precios) ? p.precios : [];

    // ¿tiene precios y todos son de su mismo producto? (ids que empiezan con "pid-")
    const hasOwnPrices =
      old.length > 0 &&
      old.every((x) => String(x.id).startsWith(`${pid}-`));

    if (hasOwnPrices) return p;

    // Si no tiene o están mezclados -> regeneramos lista base
    return {
      ...p,
      precios: [
        { id: `${pid}-U`, tipo: "UNIDAD", cantidad: 1, precio: base, activo: true },
        { id: `${pid}-P6`, tipo: "PACK", cantidad: 6, precio: base * 6, activo: true },
        { id: `${pid}-P12`, tipo: "PACK", cantidad: 12, precio: base * 12, activo: true },
        { id: `${pid}-P15`, tipo: "PACK", cantidad: 15, precio: base * 15, activo: true },
      ],
    };
  });
}

// ✅ MIGRACIÓN: carga state, corrige products y vuelve a guardar
function loadStateWithMigration() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);

    // Si hay products, los migramos/normalizamos (precios)
    if (data?.products) {
      const migratedProducts = ensurePriceList(data.products);
      const changed = JSON.stringify(migratedProducts) !== JSON.stringify(data.products);
      if (changed) {
        data.products = migratedProducts;
        saveState(data); // ✅ guarda ya migrado para que quede fijo
      }
    }

    return data;
  } catch {
    return null;
  }
}

// --- PROVIDER ---
export function BodegaProvider({ children }) {
  const saved = loadStateWithMigration();

  // Estados de Negocio
  const [products, setProducts] = useState(() =>
    ensurePriceList(saved?.products ?? initialProducts)
  );
  const [sales, setSales] = useState(saved?.sales ?? []);
  const [days, setDays] = useState(saved?.days ?? []);
  const [movements, setMovements] = useState(saved?.movements ?? []);

  // Estados de Usuario y Sesión
  const [user, setUser] = useState(saved?.user ?? null);
  const [users, setUsers] = useState(
    saved?.users ?? [
      { id: 1, username: "admin", password: "123", role: "admin", nombre: "Administrador" },
      { id: 2, username: "pedro", password: "123", role: "almacenista", nombre: "Pedro Almacén" },
    ]
  );

  // Persistencia automática
  useEffect(() => {
    saveState({ products, sales, days, movements, user, users });
  }, [products, sales, days, movements, user, users]);

  // --- LÓGICA DE USUARIOS ---
  const login = (username, password) => {
    const found = users.find((u) => u.username === username && u.password === password);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  const addUser = (newUser) => {
    if (users.some((u) => u.username === newUser.username)) return alert("Error: El usuario ya existe.");
    setUsers((prev) => [...prev, { ...newUser, id: Date.now() }]);
  };

  const updateUser = (id, patch) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, ...patch };
          if (user && user.id === id) setUser(updated);
          return updated;
        }
        return u;
      })
    );
  };

  const deleteUser = (id) => {
    if (id === 1) return alert("No puedes eliminar al administrador principal.");
    if (confirm("¿Seguro que deseas eliminar este usuario?")) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  // --- LÓGICA DE NEGOCIO ---
  // ✅ soporta precio por unidad/pack pasando priceOptionId y qty en unidades
  const sell = ({
    productId,
    qty,
    paymentMethod = "efectivo",
    priceOptionId = null,
    price = null,
    packs = null,
  }) => {
    const id = Number(productId);
    const q = Number(qty); // unidades a descontar
    const p = products.find((x) => x.id === id);

    if (!p || p.active === false || q <= 0 || q > Number(p.stock ?? 0)) {
      return alert("Error en venta o stock insuficiente");
    }

    let precioAplicado = 0;
    let priceMeta = null;

    if (priceOptionId && Array.isArray(p.precios)) {
      const opt = p.precios.find((o) => String(o.id) === String(priceOptionId));
      if (opt) {
        priceMeta = { priceOptionId: opt.id, tipo: opt.tipo, packQty: Number(opt.cantidad) };
        if (packs != null) {
          precioAplicado = Number(opt.precio); // precio por pack/opción
        } else {
          precioAplicado = Number(opt.precio) / Number(opt.cantidad || 1); // unitario equivalente
        }
      }
    }

    if (!precioAplicado || precioAplicado <= 0) {
      const base = p.precioOferta > 0 ? Number(p.precioOferta) : Number(p.precio);
      precioAplicado = Number(price ?? base);
    }

    const total = packs != null ? precioAplicado * Number(packs) : precioAplicado * q;

    setProducts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, stock: Number(x.stock ?? 0) - q } : x))
    );

    const sale = {
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Date.now()),
      productId: p.id,
      nombre: p.nombre,
      qty: q, // unidades descontadas
      packs: packs != null ? Number(packs) : null,
      precio: precioAplicado,
      total,
      paymentMethod,
      vendedor: user?.nombre || "Sistema",
      createdAt: new Date().toISOString(),
      ...priceMeta,
    };

    setSales((prev) => [sale, ...prev]);
  };

  const cancelSale = (saleId) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    if (!confirm(`¿Anular venta de ${sale.nombre}?`)) return;

    setProducts((prev) =>
      prev.map((p) =>
        p.id === sale.productId ? { ...p, stock: Number(p.stock ?? 0) + Number(sale.qty ?? 0) } : p
      )
    );
    setSales((prev) => prev.filter((s) => s.id !== saleId));
  };

  // ✅ cuando agregás producto, también se crean precios por unidad/pack
  const addProduct = ({ nombre, sku, categoria, descripcion, precio, precioOferta, stock, minimo }) => {
    const sk = normalizeSku(sku);
    if (products.some((p) => normalizeSku(p.sku) === sk)) return alert("SKU ya existe");

    const id = Date.now();
    const base = Number(precio || 0);
    const pid = String(id);

    const newP = {
      id,
      nombre: String(nombre ?? "").trim(),
      sku: sk,
      categoria: String(categoria ?? "").trim(),
      descripcion: String(descripcion ?? "").trim(),
      precio: base,
      precioOferta: Number(precioOferta || 0),
      stock: Number(stock || 0),
      minimo: Number(minimo || 0),
      active: true,
      precios: [
        { id: `${pid}-U`, tipo: "UNIDAD", cantidad: 1, precio: base, activo: true },
        { id: `${pid}-P6`, tipo: "PACK", cantidad: 6, precio: base * 6, activo: true },
        { id: `${pid}-P12`, tipo: "PACK", cantidad: 12, precio: base * 12, activo: true },
        { id: `${pid}-P15`, tipo: "PACK", cantidad: 15, precio: base * 15, activo: true },
      ],
    };

    setProducts((prev) => [newP, ...prev]);
  };

  // ✅ si cambia el precio base, recalcula precios default
  const updateProduct = (id, patch) => {
    const pid = Number(id);
    setProducts((prev) => {
      if (patch.sku) {
        const newSku = normalizeSku(patch.sku);
        if (prev.some((p) => p.id !== pid && normalizeSku(p.sku) === newSku)) {
          alert("SKU ya existe");
          return prev;
        }
      }

      return prev.map((p) => {
        if (p.id !== pid) return p;

        const updated = { ...p, ...patch };

        // Si venía de una versión vieja o quedó sin lista, regeneramos
        if (!Array.isArray(updated.precios) || updated.precios.length === 0) {
          return ensurePriceList([updated])[0];
        }

        // Si se actualiza precio, actualizamos la lista base (respetando activo si existía)
        if (patch.precio != null) {
          const base = Number(updated.precio || 0);
          const idStr = String(updated.id);

          const old = Array.isArray(updated.precios) ? updated.precios : [];
          const isActive = (key) => old.find((x) => String(x.id) === key)?.activo !== false;

          updated.precios = [
            { id: `${idStr}-U`, tipo: "UNIDAD", cantidad: 1, precio: base, activo: isActive(`${idStr}-U`) },
            { id: `${idStr}-P6`, tipo: "PACK", cantidad: 6, precio: base * 6, activo: isActive(`${idStr}-P6`) },
            { id: `${idStr}-P12`, tipo: "PACK", cantidad: 12, precio: base * 12, activo: isActive(`${idStr}-P12`) },
            { id: `${idStr}-P15`, tipo: "PACK", cantidad: 15, precio: base * 15, activo: isActive(`${idStr}-P15`) },
          ];
        }

        return updated;
      });
    });
  };

  const deactivateProduct = (id) => updateProduct(id, { active: false });
  const activateProduct = (id) => updateProduct(id, { active: true });

  const addStock = (id, qty, metadata = null) => {
    const pid = Number(id);
    const q = Number(qty);
    setProducts((prev) =>
      prev.map((p) => (p.id === pid ? { ...p, stock: Math.max(0, Number(p.stock ?? 0) + q) } : p))
    );

    if (metadata) {
      setMovements((prev) => [
        {
          id: Date.now(),
          productId: pid,
          qty: Math.abs(q),
          responsable: user?.nombre || "Sistema",
          date: new Date().toISOString(),
          ...metadata,
        },
        ...prev,
      ]);
    }
  };

  const summary = useMemo(() => {
    const total = sales.reduce((acc, s) => acc + Number(s.total ?? 0), 0);
    const byPayment = sales.reduce(
      (acc, s) => {
        const key = (s.paymentMethod || "efectivo").toLowerCase();
        acc[key] = (acc[key] || 0) + Number(s.total ?? 0);
        return acc;
      },
      { efectivo: 0, transferencia: 0, tarjeta: 0 }
    );

    const alertas = products.filter(
      (p) => p.active !== false && Number(p.stock ?? 0) <= Number(p.minimo ?? 0)
    );

    return { ventas: sales.length, total, alertas, byPayment };
  }, [sales, products]);

  const closeDay = () => {
    if (sales.length === 0) return alert("No hay ventas para cerrar.");
    const day = {
      id: Date.now(),
      closedAt: new Date().toISOString(),
      ventas: summary.ventas,
      total: summary.total,
      sales: [...sales],
      byPayment: summary.byPayment,
      encargado: user?.nombre || "Admin",
    };
    setDays((prev) => [day, ...prev]);
    setSales([]);
    alert("Día cerrado ✅");
  };

  const value = {
    user,
    users,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    products,
    sales,
    days,
    movements,
    summary,
    sell,
    cancelSale,
    closeDay,
    addProduct,
    updateProduct,
    addStock,
    deactivateProduct,
    activateProduct,
    resetAll: () => {
      if (confirm("¿Borrar todo?")) {
        localStorage.clear();
        window.location.reload();
      }
    },
  };

  return <BodegaContext.Provider value={value}>{children}</BodegaContext.Provider>;
}

export function useBodega() {
  const ctx = useContext(BodegaContext);
  if (!ctx) throw new Error("useBodega debe usarse dentro de BodegaProvider");
  return ctx;
}
