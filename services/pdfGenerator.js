// services/pdfGenerator.js — Generador de PDF institucional GSD
const PDFDocument = require('pdfkit');

// Static requires to guarantee inclusion in Vercel Serverless bundle
try {
  require('pdfkit/js/standard-fonts/Helvetica.cjs');
  require('pdfkit/js/standard-fonts/HelveticaBold.cjs');
  require('pdfkit/js/standard-fonts/HelveticaOblique.cjs');
  require('pdfkit/js/standard-fonts/HelveticaBoldOblique.cjs');
  require('pdfkit/js/standard-fonts/TimesRoman.cjs');
  require('pdfkit/js/standard-fonts/TimesBold.cjs');
  require('pdfkit/js/standard-fonts/TimesItalic.cjs');
  require('pdfkit/js/standard-fonts/TimesBoldItalic.cjs');
  require('pdfkit/js/standard-fonts/Courier.cjs');
  require('pdfkit/js/standard-fonts/CourierBold.cjs');
} catch (e) {}

function generateQuotationPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 45, right: 45 },
        info: {
          Title: `Cotización ${data.referencia || 'GSD'}`,
          Author: 'Geosolutions Source Dominicana, S.R.L.',
          Subject: data.servicio_titulo || 'Propuesta de Servicios',
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const NAVY = '#1A3A52';
      const GREEN = '#4A9B6F';
      const GRAY = '#6B7280';
      const LINE = '#E5E7EB';
      const INK = '#1F2937';

      // ─── ENCABEZADO ───────────────────────────────────
      doc.fontSize(22).font('Helvetica-Bold').fillColor(NAVY).text('GSD', 45, 45);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(GRAY).text('GEOSOLUTIONS SOURCE DOMINICANA', 45, 70);
      doc.fontSize(7.5).font('Helvetica').fillColor(GREEN).text('DERECHO INMOBILIARIO · AGRIMENSURA · REAL ESTATE', 45, 80);

      doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text('Punta Cana, Rep. Dominicana', 380, 45, { align: 'right' });
      doc.fontSize(7.5).text('Tel: (829) 493-7254 | RNC: 1-33-79694-5', 380, 56, { align: 'right' });
      doc.fontSize(7.5).text('Esteban@geosolutions.com', 380, 67, { align: 'right' });

      // Línea divisoria superior
      doc.strokeColor(LINE).lineWidth(1).moveTo(45, 96).lineTo(550, 96).stroke();

      // ─── TÍTULO DOCUMENTO ─────────────────────────────
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GREEN).text('PROPUESTA DE SERVICIOS / COTIZACIÓN', 45, 112);
      doc.fontSize(18).font('Helvetica-Bold').fillColor(NAVY).text(data.servicio_titulo || 'Iguala de Servicios Legales', 45, 126);
      if (data.observaciones) {
        doc.fontSize(9).font('Helvetica').fillColor(GRAY).text(data.observaciones.substring(0, 120), 45, 150);
      }

      // ─── DATOS CLIENTE & REFERENCIA (Grid 2 columnas) ─
      const boxY = 175;
      doc.roundedRect(45, boxY, 245, 75, 6).fillAndStroke('#F9FAFB', LINE);
      doc.roundedRect(305, boxY, 245, 75, 6).fillAndStroke('#F9FAFB', LINE);

      // Columna 1: Cliente
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY).text('PREPARADO PARA:', 55, boxY + 10);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(INK).text(data.cliente_nombre || 'Cliente', 55, boxY + 22);
      doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(`Cédula / RNC: ${data.cliente_doc || '—'}`, 55, boxY + 36);
      doc.fontSize(8).text(`Email: ${data.cliente_email || '—'}`, 55, boxY + 48);
      doc.fontSize(8).text(`Teléfono: ${data.cliente_tel || '—'}`, 55, boxY + 60);

      // Columna 2: Documento
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GRAY).text('INFORMACIÓN DE CONTROL:', 315, boxY + 10);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY).text(`Referencia: ${data.referencia || 'GSD-PRO-2026-001'}`, 315, boxY + 24);
      doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(`Fecha de emisión: ${data.fecha || new Date().toISOString().substring(0,10)}`, 315, boxY + 38);
      doc.fontSize(8).text(`Vigencia de la oferta: ${data.vigencia_dias || 30} días`, 315, boxY + 50);
      doc.fontSize(8).text(`Atendido por: Esteban G. Mejía Pérez`, 315, boxY + 62);

      // ─── TABLA DE HONORARIOS Y CONCEPTOS ──────────────
      const tableY = 270;
      doc.rect(45, tableY, 505, 22).fill(NAVY);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('DESCRIPCIÓN DEL SERVICIO', 55, tableY + 7);
      doc.text('CANT.', 350, tableY + 7, { width: 40, align: 'center' });
      doc.text('HONORARIO', 410, tableY + 7, { width: 65, align: 'right' });
      doc.text('TOTAL', 485, tableY + 7, { width: 55, align: 'right' });

      // Filas de conceptos
      let currentY = tableY + 22;
      const items = Array.isArray(data.items) && data.items.length > 0 
        ? data.items 
        : [{ desc: data.servicio_titulo || 'Servicios Profesionales Especializados', cant: 1, precio: data.monto_base || 0 }];

      const mon = data.moneda === 'DOP' ? 'RD$' : 'US$';

      items.forEach((item, idx) => {
        const bgRow = idx % 2 === 0 ? '#ffffff' : '#F9FAFB';
        doc.rect(45, currentY, 505, 28).fill(bgRow);
        
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(INK).text(item.desc || '', 55, currentY + 6, { width: 285 });
        doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(`${item.cant || 1}`, 350, currentY + 8, { width: 40, align: 'center' });
        doc.fontSize(8).text(`${mon} ${Number(item.precio || 0).toLocaleString('en-US', {minimumFractionDigits:2})}`, 410, currentY + 8, { width: 65, align: 'right' });
        
        const lineTotal = (item.cant || 1) * (item.precio || 0);
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY).text(`${mon} ${Number(lineTotal).toLocaleString('en-US', {minimumFractionDigits:2})}`, 485, currentY + 8, { width: 55, align: 'right' });
        
        doc.strokeColor(LINE).lineWidth(0.5).moveTo(45, currentY + 28).lineTo(550, currentY + 28).stroke();
        currentY += 28;
      });

      // ─── TOTALES Y CIERRE ECONÓMICO ───────────────────
      const totalsY = currentY + 12;
      const subtotal = Number(data.monto_base || 0);
      const itbis = Number(data.itbis || 0);
      const total = Number(data.total || subtotal + itbis);

      doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('Subtotal:', 380, totalsY);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(INK).text(`${mon} ${subtotal.toLocaleString('en-US', {minimumFractionDigits:2})}`, 460, totalsY, { width: 80, align: 'right' });

      if (itbis > 0) {
        doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('ITBIS (18%):', 380, totalsY + 14);
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(INK).text(`${mon} ${itbis.toLocaleString('en-US', {minimumFractionDigits:2})}`, 460, totalsY + 14, { width: 80, align: 'right' });
      }

      doc.rect(370, totalsY + 30, 180, 26).fill(GREEN);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff').text('TOTAL GENERAL:', 380, totalsY + 38);
      doc.fontSize(11).text(`${mon} ${total.toLocaleString('en-US', {minimumFractionDigits:2})}`, 450, totalsY + 37, { width: 90, align: 'right' });

      // ─── CONDICIONES COMERCIALES ──────────────────────
      const condY = totalsY + 68;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY).text('CONDICIONES & TÉRMINOS:', 45, condY);
      doc.fontSize(7.5).font('Helvetica').fillColor(GRAY);
      doc.text('• Validez de la cotización: 30 días calendario a partir de su emisión.', 45, condY + 14);
      doc.text('• Forma de pago: 50% al inicio / 50% contra entrega y cierre satisfactorio.', 45, condY + 24);
      doc.text('• Pagos mediante transferencia bancaria a nombre de Geosolutions Source Dominicana, S.R.L.', 45, condY + 34);
      doc.text('• No incluye tasas e impuestos oficiales de la DGII ni derechos de registro de títulos.', 45, condY + 44);

      // ─── BLOQUE DE FIRMAS FORMALES ────────────────────
      const signY = 690;
      doc.strokeColor(LINE).lineWidth(1).moveTo(45, signY).lineTo(220, signY).stroke();
      doc.strokeColor(LINE).lineWidth(1).moveTo(375, signY).lineTo(550, signY).stroke();

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY).text('Esteban G. Mejía Pérez', 45, signY + 6);
      doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text('Gerente · Abogado · Agrimensor', 45, signY + 17);
      doc.text('Geosolutions Source Dominicana, S.R.L.', 45, signY + 27);

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY).text(data.cliente_nombre || 'Firma del Cliente', 375, signY + 6);
      doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text('Conformidad y Aceptación', 375, signY + 17);
      doc.text('Fecha: ____ / ____ / ________', 375, signY + 27);

      // ─── PIE DE PÁGINA ────────────────────────────────
      doc.strokeColor(LINE).lineWidth(0.5).moveTo(45, 770).lineTo(550, 770).stroke();
      doc.fontSize(7).font('Helvetica').fillColor(GRAY).text(
        'Av. Barceló, Plaza Roque III, Punta Cana, R.D. · Tel: (829) 493-7254 · RNC 1-33-79694-5 · www.geosolutionssource.com',
        45, 778, { align: 'center', width: 505 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateQuotationPDF };
