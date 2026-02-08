
-- =========================
-- BODEGA: Tablas principales
-- =========================

-- (Opcional) extensión para búsquedas sin tildes / etc.
-- CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1) Roles/usuarios del sistema (solo roles, nada de tokens)
CREATE TABLE IF NOT EXISTS usuarios (
  id            BIGSERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  usuario       VARCHAR(60)  NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  rol           VARCHAR(20)  NOT NULL CHECK (rol IN ('admin', 'almacenista')),
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2) Categorías (opcional pero útil)
CREATE TABLE IF NOT EXISTS categorias (
  id         BIGSERIAL PRIMARY KEY,
  nombre     VARCHAR(80) NOT NULL UNIQUE,
  activo     BOOLEAN     NOT NULL DEFAULT TRUE
);

-- 3) Productos
CREATE TABLE IF NOT EXISTS productos (
  id             BIGSERIAL PRIMARY KEY,
  sku            VARCHAR(50) UNIQUE,
  nombre         VARCHAR(160) NOT NULL,
  descripcion    TEXT,
  categoria_id   BIGINT REFERENCES categorias(id),
  unidad         VARCHAR(20) NOT NULL DEFAULT 'unidad',  -- unidad, caja, pack, etc
  precio_compra  NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta   NUMERIC(12,2) NOT NULL DEFAULT 0,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Depósitos / almacenes (si tenés más de uno; si solo es uno, igual sirve)
CREATE TABLE IF NOT EXISTS depositos (
  id        BIGSERIAL PRIMARY KEY,
  nombre    VARCHAR(120) NOT NULL UNIQUE,
  activo    BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 5) Stock por depósito y producto
CREATE TABLE IF NOT EXISTS stock (
  deposito_id BIGINT NOT NULL REFERENCES depositos(id),
  producto_id BIGINT NOT NULL REFERENCES productos(id),
  cantidad    NUMERIC(14,3) NOT NULL DEFAULT 0, -- por si manejas fraccionado
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (deposito_id, producto_id)
);

-- 6) Movimientos de stock (entradas/salidas/ajustes)
CREATE TABLE IF NOT EXISTS movimientos_stock (
  id           BIGSERIAL PRIMARY KEY,
  fecha        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo         VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada','salida','ajuste')),
  deposito_id  BIGINT NOT NULL REFERENCES depositos(id),
  usuario_id   BIGINT REFERENCES usuarios(id),
  observacion  TEXT
);

CREATE TABLE IF NOT EXISTS movimientos_stock_detalle (
  id              BIGSERIAL PRIMARY KEY,
  movimiento_id   BIGINT NOT NULL REFERENCES movimientos_stock(id) ON DELETE CASCADE,
  producto_id     BIGINT NOT NULL REFERENCES productos(id),
  cantidad        NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  costo_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- 7) Clientes y proveedores (para distribuidora)
CREATE TABLE IF NOT EXISTS clientes (
  id        BIGSERIAL PRIMARY KEY,
  nombre    VARCHAR(160) NOT NULL,
  ruc       VARCHAR(30),
  telefono  VARCHAR(50),
  direccion TEXT,
  activo    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS proveedores (
  id        BIGSERIAL PRIMARY KEY,
  nombre    VARCHAR(160) NOT NULL,
  ruc       VARCHAR(30),
  telefono  VARCHAR(50),
  direccion TEXT,
  activo    BOOLEAN NOT NULL DEFAULT TRUE
);

-- 8) Ventas (salidas)
CREATE TABLE IF NOT EXISTS ventas (
  id           BIGSERIAL PRIMARY KEY,
  fecha        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cliente_id   BIGINT REFERENCES clientes(id),
  deposito_id  BIGINT NOT NULL REFERENCES depositos(id),
  usuario_id   BIGINT REFERENCES usuarios(id),
  total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado       VARCHAR(20) NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('borrador','confirmada','anulada')),
  observacion  TEXT
);

CREATE TABLE IF NOT EXISTS ventas_detalle (
  id          BIGSERIAL PRIMARY KEY,
  venta_id    BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id BIGINT NOT NULL REFERENCES productos(id),
  cantidad    NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  precio_unit NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- 9) Compras (entradas)
CREATE TABLE IF NOT EXISTS compras (
  id            BIGSERIAL PRIMARY KEY,
  fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proveedor_id  BIGINT REFERENCES proveedores(id),
  deposito_id   BIGINT NOT NULL REFERENCES depositos(id),
  usuario_id    BIGINT REFERENCES usuarios(id),
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado        VARCHAR(20) NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('borrador','confirmada','anulada')),
  observacion   TEXT
);

CREATE TABLE IF NOT EXISTS compras_detalle (
  id           BIGSERIAL PRIMARY KEY,
  compra_id    BIGINT NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id  BIGINT NOT NULL REFERENCES productos(id),
  cantidad     NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  costo_unit   NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- =========================
-- Datos iniciales mínimos
-- =========================
INSERT INTO depositos(nombre) VALUES ('Principal')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO categorias(nombre) VALUES ('General')
ON CONFLICT (nombre) DO NOTHING;


--=======================
--Función: sumar stock compras
--==================================
CREATE OR REPLACE FUNCTION sumar_stock_compra()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock (deposito_id, producto_id, cantidad)
  VALUES (1, NEW.producto_id, NEW.cantidad)
  ON CONFLICT (deposito_id, producto_id)
  DO UPDATE SET
    cantidad = stock.cantidad + EXCLUDED.cantidad,
    actualizado_en = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


--=====================================

--Trigger: al insertar detalle de compra
--====================================
CREATE TRIGGER trg_sumar_stock_compra
AFTER INSERT ON compras_detalle
FOR EACH ROW
EXECUTE FUNCTION sumar_stock_compra();

--=====================================
--Función: restar stock (ventas
--======================================
CREATE OR REPLACE FUNCTION restar_stock_venta()
RETURNS TRIGGER AS $$
DECLARE
  stock_actual NUMERIC;
BEGIN
  SELECT cantidad
  INTO stock_actual
  FROM stock
  WHERE deposito_id = 1
    AND producto_id = NEW.producto_id;

  IF stock_actual IS NULL OR stock_actual < NEW.cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente para el producto %', NEW.producto_id;
  END IF;

  UPDATE stock
  SET cantidad = cantidad - NEW.cantidad,
      actualizado_en = NOW()
  WHERE deposito_id = 1
    AND producto_id = NEW.producto_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--================================
--Trigger: al insertar detalle de venta
--=====================================

CREATE TRIGGER trg_restar_stock_venta
AFTER INSERT ON ventas_detalle
FOR EACH ROW
EXECUTE FUNCTION restar_stock_venta();


BEGIN;

-- ==========================================
-- 1) Nuevas tablas: presentaciones / listas / precios
-- ==========================================

CREATE TABLE IF NOT EXISTS presentaciones (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,         -- unidad, pack12, pack15, pack24
  factor NUMERIC(14,3) NOT NULL CHECK (factor > 0) -- cuántas unidades reales representa
);

CREATE TABLE IF NOT EXISTS listas_precio (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,         -- normal, promo
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS precios_producto (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  presentacion_id BIGINT NOT NULL REFERENCES presentaciones(id),
  lista_id BIGINT NOT NULL REFERENCES listas_precio(id),
  precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  vigente_hasta DATE,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- (Opcional pero recomendable) índice para buscar rápido el precio vigente
CREATE INDEX IF NOT EXISTS idx_precios_busqueda
ON precios_producto (producto_id, presentacion_id, lista_id, activo, vigente_desde);

-- ==========================================
-- 2) Carga base de presentaciones y listas
-- ==========================================

INSERT INTO presentaciones (nombre, factor) VALUES
('unidad', 1),
('pack12', 12),
('pack15', 15),
('pack24', 24)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO listas_precio (nombre) VALUES
('normal'),
('promo')
ON CONFLICT (nombre) DO NOTHING;

-- ==========================================
-- 3) Agregar columnas a detalle de ventas/compras
--    (para saber si fue unidad/pack12/pack15/pack24 y si es normal/promo)
-- ==========================================

-- Ventas
ALTER TABLE ventas_detalle
  ADD COLUMN IF NOT EXISTS presentacion_id BIGINT,
  ADD COLUMN IF NOT EXISTS lista_id BIGINT;

-- Compras
ALTER TABLE compras_detalle
  ADD COLUMN IF NOT EXISTS presentacion_id BIGINT;

-- Setear valores por defecto a registros existentes (si los hubiera)
UPDATE ventas_detalle
SET presentacion_id = (SELECT id FROM presentaciones WHERE nombre='unidad')
WHERE presentacion_id IS NULL;

UPDATE ventas_detalle
SET lista_id = (SELECT id FROM listas_precio WHERE nombre='normal')
WHERE lista_id IS NULL;

UPDATE compras_detalle
SET presentacion_id = (SELECT id FROM presentaciones WHERE nombre='unidad')
WHERE presentacion_id IS NULL;

-- Agregar FKs (si ya existían no pasa nada al re-ejecutar; por eso usamos nombres fijos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ventas_detalle_presentacion'
  ) THEN
    ALTER TABLE ventas_detalle
      ADD CONSTRAINT fk_ventas_detalle_presentacion
      FOREIGN KEY (presentacion_id) REFERENCES presentaciones(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ventas_detalle_lista'
  ) THEN
    ALTER TABLE ventas_detalle
      ADD CONSTRAINT fk_ventas_detalle_lista
      FOREIGN KEY (lista_id) REFERENCES listas_precio(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_compras_detalle_presentacion'
  ) THEN
    ALTER TABLE compras_detalle
      ADD CONSTRAINT fk_compras_detalle_presentacion
      FOREIGN KEY (presentacion_id) REFERENCES presentaciones(id);
  END IF;
END $$;

-- Hacer NOT NULL (ya cargamos valores)
ALTER TABLE ventas_detalle
  ALTER COLUMN presentacion_id SET NOT NULL,
  ALTER COLUMN lista_id SET NOT NULL;

ALTER TABLE compras_detalle
  ALTER COLUMN presentacion_id SET NOT NULL;

-- ==========================================
-- 4) Reemplazar triggers de stock para que usen el factor de la presentación
--    Stock siempre se guarda en UNIDADES.
-- ==========================================

-- Quitar triggers viejos si existen
DROP TRIGGER IF EXISTS trg_sumar_stock_compra ON compras_detalle;
DROP TRIGGER IF EXISTS trg_restar_stock_venta ON ventas_detalle;

-- Reemplazar funciones

CREATE OR REPLACE FUNCTION sumar_stock_compra()
RETURNS TRIGGER AS $$
DECLARE
  factor_pres NUMERIC;
  unidades NUMERIC;
BEGIN
  SELECT factor INTO factor_pres
  FROM presentaciones
  WHERE id = NEW.presentacion_id;

  unidades := NEW.cantidad * factor_pres;

  INSERT INTO stock (deposito_id, producto_id, cantidad)
  VALUES (1, NEW.producto_id, unidades)
  ON CONFLICT (deposito_id, producto_id)
  DO UPDATE SET
    cantidad = stock.cantidad + EXCLUDED.cantidad,
    actualizado_en = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restar_stock_venta()
RETURNS TRIGGER AS $$
DECLARE
  factor_pres NUMERIC;
  unidades NUMERIC;
  stock_actual NUMERIC;
BEGIN
  SELECT factor INTO factor_pres
  FROM presentaciones
  WHERE id = NEW.presentacion_id;

  unidades := NEW.cantidad * factor_pres;

  SELECT cantidad
  INTO stock_actual
  FROM stock
  WHERE deposito_id = 1
    AND producto_id = NEW.producto_id;

  IF stock_actual IS NULL OR stock_actual < unidades THEN
    RAISE EXCEPTION 'Stock insuficiente para producto % (stock=%, necesita=%)',
      NEW.producto_id, COALESCE(stock_actual, 0), unidades;
  END IF;

  UPDATE stock
  SET cantidad = cantidad - unidades,
      actualizado_en = NOW()
  WHERE deposito_id = 1
    AND producto_id = NEW.producto_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Volver a crear triggers
CREATE TRIGGER trg_sumar_stock_compra
AFTER INSERT ON compras_detalle
FOR EACH ROW
EXECUTE FUNCTION sumar_stock_compra();

CREATE TRIGGER trg_restar_stock_venta
AFTER INSERT ON ventas_detalle
FOR EACH ROW
EXECUTE FUNCTION restar_stock_venta();

COMMIT;


BEGIN;

-- =========================================================
-- 1) Vista: precio vigente por producto/presentación/lista
--    Devuelve 1 fila (la última vigente) por combinación.
-- =========================================================
CREATE OR REPLACE VIEW v_precio_vigente AS
SELECT DISTINCT ON (pp.producto_id, pp.presentacion_id, pp.lista_id)
  pp.producto_id,
  pp.presentacion_id,
  pp.lista_id,
  pp.precio,
  pp.vigente_desde,
  pp.vigente_hasta
FROM precios_producto pp
WHERE pp.activo = TRUE
  AND pp.vigente_desde <= CURRENT_DATE
  AND (pp.vigente_hasta IS NULL OR pp.vigente_hasta >= CURRENT_DATE)
ORDER BY
  pp.producto_id, pp.presentacion_id, pp.lista_id,
  pp.vigente_desde DESC, pp.id DESC;

-- =========================================================
-- 2) Función: devuelve el precio vigente (o error si no existe)
-- =========================================================
CREATE OR REPLACE FUNCTION get_precio_vigente(
  p_producto_id BIGINT,
  p_presentacion_id BIGINT,
  p_lista_id BIGINT,
  p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC AS $$
DECLARE
  v_precio NUMERIC;
BEGIN
  SELECT pp.precio
  INTO v_precio
  FROM precios_producto pp
  WHERE pp.producto_id = p_producto_id
    AND pp.presentacion_id = p_presentacion_id
    AND pp.lista_id = p_lista_id
    AND pp.activo = TRUE
    AND pp.vigente_desde <= p_fecha
    AND (pp.vigente_hasta IS NULL OR pp.vigente_hasta >= p_fecha)
  ORDER BY pp.vigente_desde DESC, pp.id DESC
  LIMIT 1;

  IF v_precio IS NULL THEN
    RAISE EXCEPTION 'No hay precio vigente para producto %, presentacion %, lista % (fecha %)',
      p_producto_id, p_presentacion_id, p_lista_id, p_fecha;
  END IF;

  RETURN v_precio;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;
