// db.js — GSD Matrix Database (sql.js - pure JS, no compilation needed)
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'db', 'gsd.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    initSchema();
    saveDb();
  }

  return db;
}

function saveDb() {
  if (!db) return;
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
  `);

  // Seed some sample data
  db.run(`
    INSERT OR IGNORE INTO propiedades (id, titulo, descripcion, precio, moneda, tipo, ubicacion, estado, destacada)
    VALUES
    (1, 'Apartamento en Piantini', 'Lujoso apartamento de 3 habitaciones con vista panorámica en el sector más exclusivo de Santo Domingo.', 280000, 'USD', 'Apartamento', 'Piantini, Santo Domingo', 'disponible', 1),
    (2, 'Villa en Casa de Campo', 'Espectacular villa de 4 habitaciones con piscina privada y acceso al campo de golf.', 750000, 'USD', 'Villa', 'Casa de Campo, La Romana', 'disponible', 1),
    (3, 'Terreno en Bávaro', 'Terreno de 2,000m² en zona turística con todos los servicios.', 120000, 'USD', 'Terreno', 'Bávaro, Punta Cana', 'disponible', 0);
  `);

  db.run(`
    INSERT OR IGNORE INTO leads (id, nombre, email, telefono, servicio, mensaje, estado)
    VALUES
    (1, 'María García', 'maria@email.com', '809-555-1234', 'Inmobiliaria', 'Busco apartamento en Piantini para inversión.', 'nuevo'),
    (2, 'Carlos Pérez', 'carlos@empresa.com', '809-555-5678', 'Legal', 'Necesito asesoría para compra de terreno.', 'contactado');
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
