/**
 * GSD Quoter — Motor de generación de PDF institucional híbrido
 *
 * Arquitectura Dual:
 * 1. Playwright (Chromium): Renderiza la plantilla HTML de Claude (alta fidelidad CSS/A4).
 * 2. PDFKit (Fallback Serverless): Si Chromium no está disponible (ej. entornos Vercel Serverless),
 *    genera automáticamente el PDF institucional vectorial sin fallos ni errores 500.
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { plantillaCotizacion } = require('./plantillaCotizacion');
const { normalizarCotizacion } = require('./cotizacionService');

// Requiere fuentes estándar para Vercel Serverless
try {
  require('pdfkit/js/standard-fonts/Helvetica.cjs');
  require('pdfkit/js/standard-fonts/HelveticaBold.cjs');
  require('pdfkit/js/standard-fonts/HelveticaOblique.cjs');
  require('pdfkit/js/standard-fonts/HelveticaBoldOblique.cjs');
} catch (e) {}

let _browser = null;
let _lanzando = null;
let _playwrightAvailable = true;

async function obtenerBrowser() {
  if (!_playwrightAvailable) return null;
  if (_browser && _browser.isConnected()) return _browser;
  if (_lanzando) return _lanzando;

  try {
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
        _playwrightAvailable = false;
        console.warn('⚠️ [PDF] Chromium no disponible en este entorno. Activando motor PDFKit.');
        return null;
      });

    return await _lanzando;
  } catch (err) {
    _playwrightAvailable = false;
    return null;
  }
}

/**
 * Generación con Playwright Chromium (Motor HTML)
 */
async function generarConPlaywright(normData) {
  const browser = await obtenerBrowser();
  if (!browser) throw new Error('Chromium no disponible');

  const html = plantillaCotizacion(normData);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 25000 });
    await page.emulateMedia({ media: 'print' });
    await page.addStyleTag({ content: '.foot{display:none !important}' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: pieNativoHTML(),
      margin: { top: '0', right: '0', bottom: '22mm', left: '0' },
      preferCSSPageSize: false,
    });
    return buffer;
  } finally {
    await context.close();
  }
}

/**
 * Generación con PDFKit (Motor Vectorial Serverless Fallback)
 */
function generarConPDFKit(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 38, bottom: 40, left: 45, right: 45 },
        info: {
          Title: `Cotización ${data.referencia || 'GSD'}`,
          Author: 'Geosolutions Source Dominicana, S.R.L.',
          Subject: data.servicio_titulo || data.servicioNombre || 'Propuesta de Servicios',
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const NAVY = '#1E3962';
      const GREEN = '#74B241';
      const GRAY = '#6B7280';
      const LINE = '#E5E7EB';
      const INK = '#1F2937';

      // ─── ENCABEZADO OFICIAL ─────────────────────────────
      const logoPng = path.join(__dirname, '..', 'public', 'gsd-quoter', 'assets', 'gsd-lockup.png');
      const fallbackLogo = path.join(__dirname, '..', 'public', 'img', 'logo-gsd.png');
      let renderedLogo = false;

      const logoPath = fs.existsSync(logoPng) ? logoPng : (fs.existsSync(fallbackLogo) ? fallbackLogo : null);
      if (logoPath) {
        try {
          doc.image(logoPath, 45, 38, { height: 38 });
          renderedLogo = true;
        } catch(e) {}
      }

      if (!renderedLogo) {
        doc.fontSize(22).font('Helvetica-Bold').fillColor(NAVY).text('GSD', 45, 40);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY).text('GEOSOLUTIONS SOURCE DOMINICANA', 45, 65);
        doc.fontSize(7).font('Helvetica').fillColor(GREEN).text('DERECHO INMOBILIARIO · AGRIMENSURA · REAL ESTATE', 45, 75);
      }

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(NAVY).text('Geosolutions Source Dominicana, S.R.L.', 350, 40, { align: 'right' });
      doc.fontSize(7).font('Helvetica').fillColor(GRAY);
      doc.text('Punta Cana, República Dominicana', 350, 51, { align: 'right' });
      doc.text('Tel: (829) 493-7254 | RNC: 1-33-79694-5', 350, 61, { align: 'right' });
      doc.text('esteban@geosolutionssource.com', 350, 71, { align: 'right' });

      // Línea divisoria
      doc.strokeColor(LINE).lineWidth(1).moveTo(45, 88).lineTo(550, 88).stroke();

      // ─── TÍTULO DOCUMENTO ─────────────────────────────
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GREEN).text('PROPUESTA DE SERVICIOS / COTIZACIÓN', 45, 102);
      const servTitle = data.servicio_titulo || data.servicioNombre || 'Servicios Profesionales Especializados';
      doc.fontSize(16).font('Helvetica-Bold').fillColor(NAVY).text(servTitle, 45, 115);
      
      const obs = data.observaciones || data.descripcion || '';
      if (obs) {
        doc.fontSize(8.5).font('Helvetica').fillColor(GRAY).text(obs.substring(0, 140), 45, 137, { width: 505 });
      }

      // ─── GRID CLIENTE & CONTROL ───────────────────────
      const boxY = obs ? 165 : 150;
      doc.roundedRect(45, boxY, 245, 75, 6).fillAndStroke('#F8FAFC', LINE);
      doc.roundedRect(305, boxY, 245, 75, 6).fillAndStroke('#F8FAFC', LINE);

      // Columna 1: Cliente
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY).text('CLIENTE', 55, boxY + 10);
      const cliNombre = data.cliente_nombre || data.clienteNombre || 'Cliente';
      const cliDoc = data.cliente_doc || data.clienteDocumento || '—';
      const cliEmail = data.cliente_email || data.clienteEmail || '—';
      const cliTel = data.cliente_tel || data.clienteTelefono || '—';
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(INK).text(cliNombre, 55, boxY + 22, { width: 225 });
      doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text(`Cédula / RNC: ${cliDoc}`, 55, boxY + 36);
      doc.fontSize(7.5).text(`Email: ${cliEmail}`, 55, boxY + 48);
      doc.fontSize(7.5).text(`Teléfono: ${cliTel}`, 55, boxY + 60);

      // Columna 2: Documento
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY).text('DOCUMENTO', 315, boxY + 10);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY).text(`Ref: ${data.referencia || 'GSD-COT-2026-001'}`, 315, boxY + 24);
      const fechaStr = data.fecha ? (typeof data.fecha === 'string' ? data.fecha.slice(0, 10) : new Date(data.fecha).toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
      doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text(`Fecha de emisión: ${fechaStr}`, 315, boxY + 38);
      doc.fontSize(7.5).text(`Vigencia: ${data.vigencia_dias || data.diasVigencia || 30} días`, 315, boxY + 50);
      doc.fontSize(7.5).text(`Preparado por: Esteban G. Mejía Pérez · Abogado`, 315, boxY + 62);

      // ─── TABLA DE HONORARIOS ──────────────────────────
      const tableY = boxY + 90;
      doc.rect(45, tableY, 505, 22).fill(NAVY);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('CONCEPTO / DESCRIPCIÓN', 55, tableY + 7);
      doc.text('CANT.', 350, tableY + 7, { width: 40, align: 'center' });
      doc.text('HONORARIO', 410, tableY + 7, { width: 65, align: 'right' });
      doc.text('TOTAL', 485, tableY + 7, { width: 55, align: 'right' });

      let currentY = tableY + 22;
      let items = [];
      if (Array.isArray(data.items) && data.items.length > 0) {
        items = data.items;
      } else {
        items = [{ concepto: servTitle, cant: 1, monto: data.monto_base || data.total || 0 }];
      }

      const mon = (data.moneda === 'DOP' || data.mon === 'DOP') ? 'RD$' : 'US$';

      items.forEach((it, idx) => {
        const bgRow = idx % 2 === 0 ? '#ffffff' : '#F8FAFC';
        doc.rect(45, currentY, 505, 26).fill(bgRow);

        const concepto = it.concepto || it.desc || it.titulo || servTitle;
        const cant = it.cant || 1;
        const precio = it.monto !== undefined ? it.monto : (it.precio || 0);
        const lineTotal = cant * precio;

        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(INK).text(concepto, 55, currentY + 6, { width: 285 });
        doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(`${cant}`, 350, currentY + 8, { width: 40, align: 'center' });
        doc.fontSize(8).text(`${mon} ${Number(precio).toLocaleString('en-US', {minimumFractionDigits:2})}`, 410, currentY + 8, { width: 65, align: 'right' });
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY).text(`${mon} ${Number(lineTotal).toLocaleString('en-US', {minimumFractionDigits:2})}`, 485, currentY + 8, { width: 55, align: 'right' });

        doc.strokeColor(LINE).lineWidth(0.5).moveTo(45, currentY + 26).lineTo(550, currentY + 26).stroke();
        currentY += 26;
      });

      // ─── TOTALES ──────────────────────────────────────
      const totalsY = currentY + 12;
      const subtotal = Number(data.monto_base !== undefined ? data.monto_base : (data.subtotal || data.total || 0));
      const itbis = Number(data.itbis || 0);
      const total = Number(data.total || subtotal + itbis);

      doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('Subtotal:', 380, totalsY);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(INK).text(`${mon} ${subtotal.toLocaleString('en-US', {minimumFractionDigits:2})}`, 460, totalsY, { width: 80, align: 'right' });

      if (itbis > 0) {
        doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('ITBIS (18%):', 380, totalsY + 14);
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(INK).text(`${mon} ${itbis.toLocaleString('en-US', {minimumFractionDigits:2})}`, 460, totalsY + 14, { width: 80, align: 'right' });
      }

      doc.rect(370, totalsY + 30, 180, 26).fill(GREEN);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff').text('TOTAL CON ITBIS:', 380, totalsY + 38);
      doc.fontSize(10.5).text(`${mon} ${total.toLocaleString('en-US', {minimumFractionDigits:2})}`, 450, totalsY + 37, { width: 90, align: 'right' });

      // ─── CONDICIONES ──────────────────────────────────
      const condY = totalsY + 68;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY).text('TÉRMINOS Y CONDICIONES:', 45, condY);
      doc.fontSize(7).font('Helvetica').fillColor(GRAY);
      doc.text('• Validez de la oferta: 30 días calendario a partir de su fecha de emisión.', 45, condY + 13);
      doc.text('• Forma de pago: 50% anticipo al inicio / 50% contra entrega de resolución o cierre satisfactorio.', 45, condY + 23);
      doc.text('• Pagos mediante transferencia bancaria a nombre de Geosolutions Source Dominicana, S.R.L.', 45, condY + 33);
      doc.text('• No incluye tasas e impuestos oficiales de la DGII ni derechos de registro de títulos.', 45, condY + 43);

      // ─── FIRMAS ───────────────────────────────────────
      const signY = 695;
      doc.strokeColor(LINE).lineWidth(1).moveTo(45, signY).lineTo(220, signY).stroke();
      doc.strokeColor(LINE).lineWidth(1).moveTo(375, signY).lineTo(550, signY).stroke();

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY).text('Esteban G. Mejía Pérez', 45, signY + 6);
      doc.fontSize(7).font('Helvetica').fillColor(GRAY).text('Abogado · Socio Gerente', 45, signY + 17);
      doc.text('Geosolutions Source Dominicana, S.R.L.', 45, signY + 26);

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY).text(cliNombre, 375, signY + 6);
      doc.fontSize(7).font('Helvetica').fillColor(GRAY).text('Conformidad y Aceptación', 375, signY + 17);
      doc.text('Fecha: ____ / ____ / ________', 375, signY + 26);

      // ─── FOOTER ───────────────────────────────────────
      doc.strokeColor(LINE).lineWidth(0.5).moveTo(45, 770).lineTo(550, 770).stroke();
      doc.fontSize(6.5).font('Helvetica').fillColor(GRAY).text(
        'Geosolutions Source Dominicana, S.R.L. · Punta Cana, República Dominicana · RNC: 1-33-79694-5 · Tel: 829 493 7254 · www.geosolutionssource.com',
        45, 778, { align: 'center', width: 505 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Función unificada para generar el PDF.
 * Intenta primero Playwright y cae limpiamente a PDFKit si no hay Chromium instalado.
 */
async function generarPDF(cotizacion) {
  const data = (cotizacion && cotizacion.total !== undefined && cotizacion.items && cotizacion.clienteNombre !== undefined)
    ? cotizacion
    : normalizarCotizacion(cotizacion);

  try {
    return await generarConPlaywright(data);
  } catch (err) {
    console.warn('[PDF] Fallback a PDFKit debido a:', err.message);
    return await generarConPDFKit(data);
  }
}

async function generateQuotationPDF(data) {
  const norm = normalizarCotizacion(data);
  return await generarPDF(norm);
}

function generarHTML(cotizacion) {
  const data = (cotizacion && cotizacion.total !== undefined && cotizacion.items)
    ? cotizacion
    : normalizarCotizacion(cotizacion);
  return plantillaCotizacion(data);
}

async function cerrar() {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);

function pieNativoHTML() {
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
  generarConPDFKit,
  cerrar
};
