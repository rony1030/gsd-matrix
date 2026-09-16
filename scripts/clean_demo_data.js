// scripts/clean_demo_data.js — Elimina de forma limpia y segura los 8 clientes de ejemplo
const { getDb, run, queryAll } = require('../db');

async function clean() {
  await getDb();
  console.log('Limpiando clientes, cotizaciones y expedientes de ejemplo ([DEMO])...');

  run("DELETE FROM leads WHERE tags LIKE '%[DEMO]%'");
  run("DELETE FROM cotizaciones WHERE referencia LIKE 'GSD-COT-2026-10%'");
  run("DELETE FROM expedientes WHERE codigo LIKE 'GSD-EXP-2026-10%'");

  console.log('✅ Todos los registros de ejemplo han sido eliminados correctamente.');
}

clean().catch(err => {
  console.error('Error al limpiar datos de ejemplo:', err);
  process.exit(1);
});
