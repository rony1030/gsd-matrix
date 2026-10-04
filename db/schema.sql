-- ==============================================================================
-- GSD Geosolutions Source Dominicana - Esquema de Base de Datos Principal & CRM
-- Base de Datos: Tablas y Estructura Central
-- ==============================================================================

-- 1. Tabla de Tipos de Cliente (Legal, Agrimensura, Bienes Raíces, Corporativo)
CREATE TABLE IF NOT EXISTS client_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#1A3A52'
);

INSERT OR IGNORE INTO client_types (nombre, color) VALUES
('General', '#64748B'),
('Bienes Raíces', '#0D9488'),
('Legal & Litigios', '#1A3A52'),
('Agrimensura & Catastro', '#4A9B6F'),
('Corporativo', '#D97706');

-- 2. Tabla de Leads y Prospectos Centralizados
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  servicio TEXT,
  tipo_cliente TEXT DEFAULT 'General',
  is_real_estate INTEGER DEFAULT 0,
  tags TEXT DEFAULT '',
  mensaje TEXT,
  estado TEXT DEFAULT 'nuevo',
  origen TEXT DEFAULT 'web',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 3. Tabla de Cotizaciones Comerciales y Presupuestos
CREATE TABLE IF NOT EXISTS cotizaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referencia TEXT UNIQUE NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_doc TEXT,
  cliente_email TEXT,
  cliente_tel TEXT,
  cliente_dir TEXT,
  servicio_tipo TEXT NOT NULL,
  servicio_titulo TEXT NOT NULL,
  monto_base REAL DEFAULT 0,
  moneda TEXT DEFAULT 'USD',
  duracion_meses INTEGER DEFAULT 1,
  superficie_m2 REAL DEFAULT 0,
  items_json TEXT DEFAULT '[]',
  condiciones_json TEXT DEFAULT '[]',
  itbis REAL DEFAULT 0,
  total REAL DEFAULT 0,
  estado TEXT DEFAULT 'borrador',
  observaciones TEXT,
  fecha TEXT DEFAULT (date('now')),
  vigencia_dias INTEGER DEFAULT 30,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 4. Tabla de Expedientes Técnicos y Jurídicos
CREATE TABLE IF NOT EXISTS expedientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  cotizacion_ref TEXT,
  servicio_tipo TEXT NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_doc TEXT,
  cliente_tel TEXT,
  cliente_email TEXT,
  cliente_dir TEXT,
  honorario REAL DEFAULT 0,
  moneda TEXT DEFAULT 'USD',
  responsable TEXT DEFAULT 'Esteban Mejía',
  tecnico TEXT,
  prioridad TEXT DEFAULT 'Media',
  estado TEXT DEFAULT 'proc',
  fecha_inicio TEXT DEFAULT (date('now')),
  fecha_fin TEXT,
  objeto_json TEXT DEFAULT '{}',
  ubicacion_json TEXT DEFAULT '{}',
  linderos_json TEXT DEFAULT '{}',
  tecnico_json TEXT DEFAULT '{}',
  docs_json TEXT DEFAULT '[]',
  tasks_json TEXT DEFAULT '[]',
  avances_json TEXT DEFAULT '[]',
  notas_json TEXT DEFAULT '[]',
  evidencias_json TEXT DEFAULT '[]',
  log_json TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 5. Tabla de Propiedades Inmobiliarias
CREATE TABLE IF NOT EXISTS propiedades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  short_description TEXT DEFAULT '',
  precio REAL,
  moneda TEXT DEFAULT 'USD',
  tipo TEXT,
  operacion TEXT DEFAULT 'Venta',
  ubicacion TEXT,
  provincia TEXT DEFAULT '',
  ciudad TEXT DEFAULT '',
  sector TEXT DEFAULT '',
  habitaciones REAL DEFAULT 0,
  banos REAL DEFAULT 0,
  parqueos INTEGER DEFAULT 0,
  area_construccion REAL DEFAULT 0,
  area_solar REAL DEFAULT 0,
  condicion TEXT DEFAULT 'Listo',
  tour_3d TEXT DEFAULT '',
  amenidades TEXT DEFAULT '[]',
  estado TEXT DEFAULT 'disponible',
  imagenes TEXT DEFAULT '[]',
  imagen_portada TEXT DEFAULT '',
  destacada INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT,
  seo_score INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 6. Tabla de Proyectos y Desarrollos Exclusivos
CREATE TABLE IF NOT EXISTS proyectos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  promotor TEXT DEFAULT 'GSD Real Estate',
  ubicacion TEXT NOT NULL,
  tipologias TEXT DEFAULT 'Apartamentos',
  precio_desde REAL DEFAULT 0,
  moneda TEXT DEFAULT 'USD',
  estado TEXT DEFAULT 'En construcción',
  entrega TEXT DEFAULT '2026',
  descripcion TEXT,
  cover_image TEXT,
  galeria TEXT DEFAULT '[]',
  amenidades TEXT DEFAULT '[]',
  bloques TEXT DEFAULT '[]',
  featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 7. Tabla de Usuarios y Operadores del Sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  usuario TEXT UNIQUE NOT NULL,
  email TEXT,
  password TEXT,
  rol TEXT NOT NULL DEFAULT 'Asistente Operativo',
  permisos_json TEXT DEFAULT '[]',
  avatar TEXT DEFAULT '',
  telefono TEXT DEFAULT '',
  cargo TEXT DEFAULT '',
  estado TEXT DEFAULT 'activo',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

INSERT OR IGNORE INTO usuarios (id, nombre, usuario, email, password, rol, permisos_json, cargo, estado)
VALUES
(
  1,
  'Esteban Mejía',
  'admin',
  'esteban@geosolutionssource.com',
  'gsd2026admin',
  'Administrador / Socio',
  '["expedientes","cotizaciones","propiedades","proyectos","blog","finanzas","ajustes","usuarios"]',
  'Director General & Abogado Notario',
  'activo'
);

-- 8. Tabla de Artículos del Blog Institucional & SEO
CREATE TABLE IF NOT EXISTS blogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  slug TEXT UNIQUE,
  categoria TEXT DEFAULT 'Inversión',
  tags TEXT DEFAULT '',
  contenido TEXT,
  imagen_portada TEXT,
  estado TEXT DEFAULT 'borrador',
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT,
  seo_score INTEGER DEFAULT 0,
  autor TEXT DEFAULT 'GSD',
  fecha_publicacion TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 9. Tabla de Configuración Global
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 10. Tabla de Integración Redes Sociales
CREATE TABLE IF NOT EXISTS social_feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  instagram_handle TEXT DEFAULT '@gsd',
  instagram_url TEXT DEFAULT 'https://www.instagram.com/',
  posts_json TEXT DEFAULT '[]',
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);
