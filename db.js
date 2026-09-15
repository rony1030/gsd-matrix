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
        UPDATE propiedades SET imagenes = '["/img/propiedades/apartment.jpg"]' WHERE id = 1 AND (imagenes IS NULL OR imagenes = '[]' OR imagenes = '');
        UPDATE propiedades SET imagenes = '["/img/propiedades/villa.jpg"]' WHERE id = 2 AND (imagenes IS NULL OR imagenes = '[]' OR imagenes = '');
        UPDATE propiedades SET imagenes = '["/img/propiedades/home.jpg"]' WHERE id = 3 AND (imagenes IS NULL OR imagenes = '[]' OR imagenes = '');
      `);
      saveDb();
    } catch(e) {}
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
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT,
      telefono TEXT,
      servicio TEXT,
      mensaje TEXT,
      estado TEXT DEFAULT 'nuevo',
      origen TEXT DEFAULT 'web',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS propiedades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      precio REAL,
      moneda TEXT DEFAULT 'USD',
      tipo TEXT,
      ubicacion TEXT,
      estado TEXT DEFAULT 'disponible',
      imagenes TEXT DEFAULT '[]',
      destacada INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      slug TEXT UNIQUE,
      contenido TEXT,
      imagen_portada TEXT,
      estado TEXT DEFAULT 'borrador',
      meta_title TEXT,
      meta_description TEXT,
      keywords TEXT,
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
  `);

  // Seed some sample data with real cover photos
  db.run(`
    INSERT OR IGNORE INTO propiedades (id, titulo, descripcion, precio, moneda, tipo, ubicacion, estado, imagenes, destacada)
    VALUES
    (1, 'Apartamento en Piantini', 'Lujoso apartamento de 3 habitaciones con vista panorámica en el sector más exclusivo de Santo Domingo.', 280000, 'USD', 'Apartamento', 'Piantini, Santo Domingo', 'disponible', '["/img/propiedades/apartment.jpg"]', 1),
    (2, 'Villa en Casa de Campo', 'Espectacular villa de 4 habitaciones con piscina privada y acceso al campo de golf.', 750000, 'USD', 'Villa', 'Casa de Campo, La Romana', 'disponible', '["/img/propiedades/villa.jpg"]', 1),
    (3, 'Terreno en Bávaro', 'Terreno de 2,000m² en zona turística con todos los servicios.', 120000, 'USD', 'Terreno', 'Bávaro, Punta Cana', 'disponible', '["/img/propiedades/home.jpg"]', 0);
  `);

  db.run(`
    UPDATE propiedades SET imagenes = '["/img/propiedades/apartment.jpg"]' WHERE id = 1 AND (imagenes IS NULL OR imagenes = '[]' OR imagenes = '');
    UPDATE propiedades SET imagenes = '["/img/propiedades/villa.jpg"]' WHERE id = 2 AND (imagenes IS NULL OR imagenes = '[]' OR imagenes = '');
    UPDATE propiedades SET imagenes = '["/img/propiedades/home.jpg"]' WHERE id = 3 AND (imagenes IS NULL OR imagenes = '[]' OR imagenes = '');
  `);

  db.run(`
    INSERT OR IGNORE INTO leads (id, nombre, email, telefono, servicio, mensaje, estado)
    VALUES
    (1, 'María García', 'maria@email.com', '809-555-1234', 'Inmobiliaria', 'Busco apartamento en Piantini para inversión.', 'nuevo'),
    (2, 'Carlos Pérez', 'carlos@empresa.com', '809-555-5678', 'Legal', 'Necesito asesoría para compra de terreno.', 'contactado');
  `);

  db.run(`
    INSERT OR IGNORE INTO social_feeds (project, project_name, instagram_handle, instagram_url, posts_json)
    VALUES
    ('bienes-raices', 'GSD Bienes Raíces', '@gsd.realestate', 'https://www.instagram.com/', '[
      {"image":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80","link":"https://www.instagram.com/","caption":"Residencia contemporánea en Piantini"},
      {"image":"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80","link":"https://www.instagram.com/","caption":"Diseño de interiores y calidez"},
      {"image":"https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80","link":"https://www.instagram.com/","caption":"Villa de lujo en Casa de Campo"},
      {"image":"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80","link":"https://www.instagram.com/","caption":"Espacios abiertos e iluminación natural"}
    ]'),
    ('matriz', 'GSD Matriz / Ingeniería & Legal', '@gsdsource', 'https://www.instagram.com/', '[
      {"image":"https://images.unsplash.com/photo-1541888946425-d0fbb1862557?auto=format&fit=crop&w=800&q=80","link":"https://www.instagram.com/","caption":"Agrimensura y deslinde de precisión"},
      {"image":"https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80","link":"https://www.instagram.com/","caption":"Asesoría y blindaje jurídico de títulos"},
      {"image":"https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80","link":"https://www.instagram.com/","caption":"Proyectos de infraestructura y topografía"},
      {"image":"https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80","link":"https://www.instagram.com/","caption":"Gestión patrimonial inmobiliaria"}
    ]');
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
