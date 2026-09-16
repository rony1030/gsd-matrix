/**
 * GSD Quoter — Motor de generación de PDF institucional
 *
 * Usa Playwright (Chromium) sobre la plantilla HTML de la cotización
 * desarrollada en Claude Quoter (plantillaCotizacion.js).
 *
 * Exporta:
 * - generateQuotationPDF(data): Interfaz compatible con el CRM existente en server.js.
 * - generarPDF(cotizacion): Interfaz directa de Claude Quoter.
 * - generarHTML(cotizacion): Devuelve el HTML procesado para vistas previas.
 * - cerrar(): Cierre ordenado del navegador Playwright.
 */

const { plantillaCotizacion } = require('./plantillaCotizacion');
const { normalizarCotizacion } = require('./cotizacionService');

let _browser = null;
let _lanzando = null;

async function obtenerBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  if (_lanzando) return _lanzando;

  const { chromium } = require('playwright');
  _lanzando = chromium
    .launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    })
    .then((b) => {
      _browser = b;
      _lanzando = null;
      b.on('disconnected', () => { _browser = null; });
      return b;
    })
    .catch((e) => {
      _lanzando = null;
      throw e;
    });

  return _lanzando;
}

/**
 * Genera el PDF de una cotización con Playwright Chromium y plantillaCotizacion.
 * @param {object} cotizacion Objeto de cotización (normalizado o crudo)
 * @returns {Promise<Buffer>}
 */
async function generarPDF(cotizacion) {
  // Asegurar normalización si no viene ya procesado
  const data = (cotizacion && cotizacion.total !== undefined && cotizacion.items && cotizacion.clienteNombre !== undefined)
    ? cotizacion
    : normalizarCotizacion(cotizacion);

  const html = plantillaCotizacion(data);
  const browser = await obtenerBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });
    await page.emulateMedia({ media: 'print' });

    // Ocultar pie HTML fijo de preview y usar pie nativo paginado
    await page.addStyleTag({ content: '.foot{display:none !important}' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: pieHTML(),
      margin: { top: '0', right: '0', bottom: '22mm', left: '0' },
      preferCSSPageSize: false,
    });
    return buffer;
  } finally {
    await context.close();
  }
}

/**
 * Función compatible con las rutas del CRM existentes en server.js
 */
async function generateQuotationPDF(data) {
  const norm = normalizarCotizacion(data);
  return await generarPDF(norm);
}

/** Devuelve el HTML sin convertir; útil para el preview en vivo. */
function generarHTML(cotizacion) {
  const data = (cotizacion && cotizacion.total !== undefined && cotizacion.items)
    ? cotizacion
    : normalizarCotizacion(cotizacion);
  return plantillaCotizacion(data);
}

/** Cierre ordenado — llamar desde el apagado del servidor. */
async function cerrar() {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);

/**
 * Pie nativo de Chromium repetible en todas las páginas.
 */
function pieHTML() {
  return `
<div style="width:100%;font-family:'Poppins',Arial,sans-serif;font-size:6.5pt;color:#8A95A3;
            padding:0 18mm;box-sizing:border-box;">
  <div style="border-top:.5pt solid #E1E6EB;padding-top:3mm;display:flex;
              justify-content:space-between;align-items:flex-end;">
    <div style="line-height:1.65;">
      <span style="color:#1E3962;font-weight:600;font-size:7pt;letter-spacing:.06em;">
        Geosolutions Source Dominicana, S.R.L.</span><br/>
      Punta Cana, Rep&uacute;blica Dominicana &nbsp;&middot;&nbsp; RNC 1-33-79694-5
      &nbsp;&middot;&nbsp; 829 493 7254<br/>
      esteban@geosolutionssource.com &nbsp;&middot;&nbsp; www.geosolutionssource.com
    </div>
    <div style="text-align:right;">
      <span style="letter-spacing:.1em;text-transform:uppercase;color:#B9C2CC;">Expertos en tierra</span><br/>
      <span style="color:#1E3962;font-weight:600;font-size:8pt;">
        <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>
  </div>
</div>`;
}

module.exports = {
  generarPDF,
  generateQuotationPDF,
  generarHTML,
  cerrar
};
