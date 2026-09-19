// db.js — GSD Matrix Database (sql.js - pure JS, no compilation needed)
const path = require('path');
const fs = require('fs');
const os = require('os');
const initSqlJs = require('sql.js');

const DB_DIR = process.env.VERCEL ? os.tmpdir() : path.join(__dirname, 'db');
const DB_PATH = path.join(DB_DIR, 'gsd.db');

let db = null;

async function getDb() {
  if (db) return db;

  const wasmPath = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  let config = {};
  if (fs.existsSync(wasmPath)) {
    const wasmBinary = fs.readFileSync(wasmPath);
    config = {
      instantiateWasm: (imports, successCallback) => {
        WebAssembly.instantiate(wasmBinary, imports).then(output => {
          successCallback(output.instance);
        }).catch(err => {
          console.error('Error instantiating wasm:', err);
        });
        return {};
      }
    };
  }
  const SQL = await initSqlJs(config);

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    try {
      db.run(`
        ALTER TABLE propiedades ADD COLUMN slug TEXT;
        ALTER TABLE propiedades ADD COLUMN short_description TEXT DEFAULT '';
        ALTER TABLE propiedades ADD COLUMN operacion TEXT DEFAULT 'Venta';
        ALTER TABLE propiedades ADD COLUMN provincia TEXT DEFAULT '';
        ALTER TABLE propiedades ADD COLUMN ciudad TEXT DEFAULT '';
        ALTER TABLE propiedades ADD COLUMN sector TEXT DEFAULT '';
        ALTER TABLE propiedades ADD COLUMN habitaciones REAL DEFAULT 0;
        ALTER TABLE propiedades ADD COLUMN banos REAL DEFAULT 0;
        ALTER TABLE propiedades ADD COLUMN parqueos INTEGER DEFAULT 0;
        ALTER TABLE propiedades ADD COLUMN area_construccion REAL DEFAULT 0;
        ALTER TABLE propiedades ADD COLUMN area_solar REAL DEFAULT 0;
        ALTER TABLE propiedades ADD COLUMN condicion TEXT DEFAULT 'Listo';
        ALTER TABLE propiedades ADD COLUMN tour_3d TEXT DEFAULT '';
        ALTER TABLE propiedades ADD COLUMN amenidades TEXT DEFAULT '[]';
        ALTER TABLE propiedades ADD COLUMN imagen_portada TEXT DEFAULT '';
      `);
    } catch(e) {}
    try {
      db.run(`
        ALTER TABLE leads ADD COLUMN tipo_cliente TEXT DEFAULT 'General';
        ALTER TABLE leads ADD COLUMN is_real_estate INTEGER DEFAULT 0;
        ALTER TABLE leads ADD COLUMN tags TEXT DEFAULT '';
      `);
    } catch(e) {}
    ['categoria TEXT DEFAULT "Inversión"', 'tags TEXT DEFAULT ""', 'meta_title TEXT DEFAULT ""', 'meta_description TEXT DEFAULT ""', 'keywords TEXT DEFAULT ""', 'seo_score INTEGER DEFAULT 0', 'autor TEXT DEFAULT "GSD"', 'fecha_publicacion TEXT'].forEach(col => {
      try { db.run(`ALTER TABLE blogs ADD COLUMN ${col};`); } catch(e) {}
    });
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS client_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT UNIQUE NOT NULL,
          color TEXT DEFAULT '#1A3A52'
        );

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
          created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at TEXT DEFAULT (datetime('now','localtime'))
        );

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
          featured INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now','localtime')),
          updated_at TEXT DEFAULT (datetime('now','localtime'))
        );

        INSERT OR IGNORE INTO proyectos (slug, nombre, promotor, ubicacion, tipologias, precio_desde, moneda, estado, entrega, descripcion, cover_image, galeria, amenidades, featured)
        VALUES
        (
          'stellar-punta-cana',
          'Stellar Residences',
          'Blue Coast Realty',
          'Bávaro, Punta Cana',
          'Apartamentos 1-3 Hab, Penthouses',
          180000,
          'USD',
          'En construcción',
          '2027',
          'Un desarrollo residencial de nueva generación frente al mar. Stellar combina arquitectura contemporánea con amenidades de resort para una vida sin compromisos en el corazón de Bávaro.',
          'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
          '["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80"]',
          '["Piscina infinita","Gym & Wellness","Spa","Concierge 24/7","Playa privada","Business center"]',
          1
        ),
        (
          'cosmo-bavaro',
          'Cosmo Smart Living',
          'GSD Real Estate',
          'Bávaro, La Altagracia',
          'Estudios, Suites 1-2 Hab',
          95000,
          'USD',
          'En construcción',
          '2026',
          'Diseñado para el inversionista inteligente. Cosmo ofrece unidades compactas de alto rendimiento y rentabilidad turística en una ubicación estratégica a minutos de las playas.',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
          '["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80"]',
          '["Piscina central","Rooftop bar & Lounge","Coworking space","Seguridad 24/7"]',
          1
        ),
        (
          'galaxy-cap-cana',
          'Galaxy Villas & Marina',
          'Cap Cana Developers',
          'Cap Cana, La Altagracia',
          'Villas de Lujo, Townhouses',
          420000,
          'USD',
          'Entrega inmediata',
          '2025',
          'Galaxy redefine el lujo en Cap Cana. Exclusivas villas y townhouses en el corazón de la marina, con acceso a campos de golf de clase mundial y servicios hoteleros de primer nivel.',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
          '["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80"]',
          '["Marina privada","Muelle de atraque","Golf Cart incluido","Club de Playa","Helipuerto","Seguridad perimetral"]',
          0
        );

        CREATE TABLE IF NOT EXISTS social_feeds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project TEXT UNIQUE NOT NULL,
          project_name TEXT NOT NULL,
          instagram_handle TEXT DEFAULT '@gsd',
          instagram_url TEXT DEFAULT 'https://www.instagram.com/',
          posts_json TEXT DEFAULT '[]',
          updated_at TEXT DEFAULT (datetime('now','localtime'))
        );

        INSERT OR IGNORE INTO social_feeds (project, project_name, instagram_handle, instagram_url, posts_json)
        VALUES
        ('bienes-raices', 'GSD Bienes Raíces', '@gsd.realestate', 'https://www.instagram.com/', '[]'),
        ('matriz', 'GSD Matriz / Ingeniería & Legal', '@gsdsource', 'https://www.instagram.com/', '[]');

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

        INSERT OR IGNORE INTO blogs (titulo, slug, categoria, tags, contenido, imagen_portada, estado, meta_title, meta_description, keywords, seo_score, autor, fecha_publicacion)
        VALUES
        (
          'Cómo elegir el destino ideal para tu próxima propiedad en RD',
          'guia-elegir-destino-propiedad-rd',
          'Guía Inmobiliaria',
          'Punta Cana, Inversión, Plusvalía',
          'Invertir en bienes raíces en República Dominicana requiere evaluar tanto el retorno por alquileres de corta estancia como la seguridad jurídica del inmueble. Punta Cana, Samaná y Santo Domingo ofrecen perfiles de rentabilidad distintos que deben alinearse con tus metas patrimoniales.',
          'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
          'publicado',
          'Cómo elegir el destino ideal para tu propiedad en RD — GSD',
          'Punta Cana, Samaná o Santo Domingo: comparativa de rentabilidad y plusvalía.',
          'inversion inmobiliaria, punta cana, bienes raices rd',
          92,
          'GSD Real Estate',
          datetime('now','localtime')
        ),
        (
          'Detalles que transforman la experiencia de un hogar contemporáneo',
          'detalles-transforman-experiencia-hogar',
          'Arquitectura & Estilo',
          'Diseño, Confort, Vanguardia',
          'La verdadera exclusividad de un inmueble no se mide solo en metros cuadrados, sino en la distribución inteligente de sus áreas sociales, iluminación natural y ventilación cruzada. Conoce los aspectos clave a revisar antes de reservar.',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          'publicado',
          'Detalles de un hogar contemporáneo — GSD Real Estate',
          'Iluminación, ventilación y distribución en inmuebles de lujo.',
          'diseño residencial, arquitectura caribeña, lujo',
          88,
          'GSD Real Estate',
          datetime('now','localtime')
        ),
        (
          'El blindaje legal imprescindible antes de reservar una propiedad',
          'blindaje-legal-compra-inmueble',
          'Seguridad Jurídica',
          'Deslinde, Título, Legal',
          'En GSD asesoramos a compradores e inversionistas para garantizar que cada título esté saneado y libre de gravámenes antes de depositar reservas. El deslinde catastral y la debida diligencia registral son la clave de una compra segura.',
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
          'publicado',
          'Blindaje legal en la compra de inmuebles — GSD Jurídico',
          'Auditoría técnica de deslinde y depuración de gravámenes en RD.',
          'deslinde catastral, seguridad juridica, abogados inmobiliarios rd',
          95,
          'GSD Jurídico',
          datetime('now','localtime')
        );
      `);
      saveDb();
    } catch(e) {
      console.error('Migration error:', e);
    }
  } else {
    db = new SQL.Database();
    initSchema();
    saveDb();
  }

  return db;
}

function saveDb() {
  if (!db) return;
  fs.mkdirSync(DB_DIR, { recursive: true });
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS client_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#1A3A52'
    );

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

    CREATE TABLE IF NOT EXISTS amenities_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS social_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT UNIQUE NOT NULL,
      project_name TEXT NOT NULL,
      instagram_handle TEXT DEFAULT '@gsd',
      instagram_url TEXT DEFAULT 'https://www.instagram.com/',
      posts_json TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

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
      featured INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('logo_url', '/img/logo-gsd.png');

    INSERT OR IGNORE INTO social_feeds (project, project_name, instagram_handle, instagram_url, posts_json)
    VALUES
    ('bienes-raices', 'GSD Bienes Raíces', '@gsd.realestate', 'https://www.instagram.com/', '[]'),
    ('matriz', 'GSD Matriz / Ingeniería & Legal', '@gsdsource', 'https://www.instagram.com/', '[]');

    INSERT OR IGNORE INTO proyectos (slug, nombre, promotor, ubicacion, tipologias, precio_desde, moneda, estado, entrega, descripcion, cover_image, galeria, amenidades, featured)
    VALUES
    (
      'stellar-punta-cana',
      'Stellar Residences',
      'Blue Coast Realty',
      'Bávaro, Punta Cana',
      'Apartamentos 1-3 Hab, Penthouses',
      180000,
      'USD',
      'En construcción',
      '2027',
      'Un desarrollo residencial de nueva generación frente al mar. Stellar combina arquitectura contemporánea con amenidades de resort para una vida sin compromisos en el corazón de Bávaro.',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      '["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80"]',
      '["Piscina infinita","Gym & Wellness","Spa","Concierge 24/7","Playa privada","Business center"]',
      1
    ),
    (
      'cosmo-bavaro',
      'Cosmo Smart Living',
      'GSD Real Estate',
      'Bávaro, La Altagracia',
      'Estudios, Suites 1-2 Hab',
      95000,
      'USD',
      'En construcción',
      '2026',
      'Diseñado para el inversionista inteligente. Cosmo ofrece unidades compactas de alto rendimiento y rentabilidad turística en una ubicación estratégica a minutos de las playas.',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      '["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80"]',
      '["Piscina central","Rooftop bar & Lounge","Coworking space","Seguridad 24/7"]',
      1
    ),
    (
      'galaxy-cap-cana',
      'Galaxy Villas & Marina',
      'Cap Cana Developers',
      'Cap Cana, La Altagracia',
      'Villas de Lujo, Townhouses',
      420000,
      'USD',
      'Entrega inmediata',
      '2025',
      'Galaxy redefine el lujo en Cap Cana. Exclusivas villas y townhouses en el corazón de la marina, con acceso a campos de golf de clase mundial y servicios hoteleros de primer nivel.',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      '["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80"]',
      '["Marina privada","Muelle de atraque","Golf Cart incluido","Club de Playa","Helipuerto","Seguridad perimetral"]',
      0
    );
  `);
}

// Helper: run query and return all rows as objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run query and return first row
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

// Helper: run INSERT/UPDATE/DELETE
function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
}

module.exports = { getDb, queryAll, queryOne, run, saveDb };
