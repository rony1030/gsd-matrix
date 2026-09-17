/**
 * GSD Quoter — Plantilla HTML de la cotización
 *
 * Devuelve el HTML completo (autocontenido) que el motor de PDF convierte a A4.
 * El logo se incrusta en base64 para que el render no dependa de rutas ni de red.
 *
 * Paleta oficial, muestreada del archivo de logo:
 *   Navy  #1E3962
 *   Verde #74B241
 * Tipografía de marca: Poppins.
 */

const fs = require('fs');
const path = require('path');
const { TERMINOS_GENERALES } = require('./catalogoServicios');

const NAVY = '#1E3962';
const GREEN = '#74B241';
const INK = '#2B3542';
const BODY = '#4A5768';
const MUTE = '#8A95A3';
const FAINT = '#B9C2CC';
const HAIR = '#E1E6EB';
const PAPER = '#F6F8FA';

const ASSETS = path.join(__dirname, '..', 'public', 'gsd-quoter', 'assets');

let _logoCache = null;
// El encabezado es navy: se usa la versión en blanco del lockup.
function logoBase64() {
  if (_logoCache) return _logoCache;
  try {
    const buf = fs.readFileSync(path.join(ASSETS, 'gsd-lockup-white.png'));
    _logoCache = 'data:image/png;base64,' + buf.toString('base64');
  } catch (e) {
    _logoCache = '';
  }
  return _logoCache;
}

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function fmtMonto(monto, moneda) {
  if (monto == null || monto === '') return '—';
  const n = Number(monto);
  if (Number.isNaN(n)) return esc(monto);
  const s = n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${moneda === 'DOP' ? 'RD$' : 'US$'} ${s}`;
}

function fmtFecha(d) {
  const f = d instanceof Date ? d : new Date(d);
  return f.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
}

/* ───────────────────────── CSS ───────────────────────── */
const CSS = `
@page {
  size: A4 portrait;
  margin: 0 !important;
}
* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
html, body {
  margin: 0 !important;
  padding: 0 !important;
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: ${BODY};
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
}

.sheet {
  position: relative;
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  min-height: auto;
  padding: 0 0 6mm 0;
  background: #ffffff;
}

/* ── encabezado institucional ── */
.head {
  background: ${NAVY};
  color: #ffffff;
  padding: 8mm 16mm 7mm 16mm;
  position: relative;
  overflow: hidden;
  margin: 0 !important;
}
.head .grid { position: absolute; inset: 0; opacity: .5; pointer-events: none; }
.head .row { position: relative; display: flex; justify-content: space-between; align-items: flex-start; }
.head img { width: 50mm; max-width: 50mm; }
.head .doc { text-align: right; }
.head .doc .lbl { font-size: 6.2pt; letter-spacing: .24em; text-transform: uppercase; color: ${GREEN}; font-weight: 600; }
.head .doc .num { font-size: 14pt; font-weight: 600; color: #ffffff; margin-top: 1mm; letter-spacing: .02em; }
.head h1 { font-size: 18pt; font-weight: 200; margin: 5mm 0 0 0; line-height: 1.15; letter-spacing: -.01em; position: relative; }
.head h1 b { font-weight: 600; color: #ffffff; }
.head .sub { font-size: 8.2pt; color: #A9BBD2; margin-top: 2mm; position: relative; font-weight: 300; }

.body { padding: 4mm 16mm 0 16mm; }

/* ── bloques ── */
.eyebrow { font-size: 6.4pt; letter-spacing: .22em; text-transform: uppercase; color: ${GREEN}; font-weight: 600; margin: 0 0 1.5mm 0; }
h2 { font-size: 11pt; font-weight: 600; color: ${NAVY}; margin: 0 0 2mm 0; }
p { font-size: 8.5pt; line-height: 1.45; margin: 0 0 1.8mm 0; }
b, strong { color: ${NAVY}; font-weight: 600; }
.rule { width: 14mm; height: 2pt; background: ${GREEN}; margin: 0 0 2.5mm 0; }
.sec { margin-bottom: 3.8mm; page-break-inside: avoid; break-inside: avoid; }

.cols { display: flex; }
.cols > div { flex: 1; }
.cols > div + div { margin-left: 8mm; }

.kv { width: 100%; border-collapse: collapse; }
.kv td { font-size: 8.4pt; padding: 1.4mm 0; border-bottom: .5pt solid ${HAIR}; vertical-align: top; }
.kv td.k { color: ${MUTE}; width: 34%; font-size: 7.2pt; letter-spacing: .06em; text-transform: uppercase; }
.kv td.v { color: ${INK}; font-weight: 500; }
.kv tr:last-child td { border-bottom: none; }

table.money { width: 100%; border-collapse: collapse; margin-top: 1mm; page-break-inside: avoid; break-inside: avoid; }
table.money th { font-size: 6.5pt; letter-spacing: .14em; text-transform: uppercase; color: ${MUTE};
  font-weight: 600; text-align: left; padding: 0 3mm 1.6mm 0; border-bottom: 1pt solid ${NAVY}; }
table.money th.r, table.money td.r { text-align: right; padding-right: 0; }
table.money td { font-size: 8.5pt; padding: 1.8mm 3mm 1.8mm 0; border-bottom: .5pt solid ${HAIR}; vertical-align: top; color: ${BODY}; }
table.money td.c { color: ${NAVY}; font-weight: 500; }
table.money td .sub { display: block; font-size: 7pt; color: ${MUTE}; margin-top: .4mm; line-height: 1.3; }
table.money tr.tot td { border-bottom: none; border-top: 1pt solid ${NAVY}; padding-top: 2.2mm;
  font-size: 10.5pt; font-weight: 600; color: ${NAVY}; }
table.money tr.sub-t td { font-size: 8.5pt; color: ${INK}; }
table.money tr.desc td { color: ${GREEN}; font-weight: 600; }

ul.tick { list-style: none; margin: 0; padding: 0; }
ul.tick li { font-size: 8.2pt; line-height: 1.4; color: ${BODY}; padding: 0 0 1.2mm 4mm; position: relative; }
ul.tick li:before { content: ''; position: absolute; left: 0; top: 1.6mm; width: 1.6mm; height: 1.6mm; background: ${GREEN}; border-radius: .4mm; }
ul.dash { list-style: none; margin: 0; padding: 0; }
ul.dash li { font-size: 8.2pt; line-height: 1.4; color: ${BODY}; padding: 0 0 1.2mm 4mm; position: relative; }
ul.dash li:before { content: ''; position: absolute; left: 0; top: 2.2mm; width: 2.2mm; height: .8pt; background: ${FAINT}; }

.steps { display: flex; margin-top: 2mm; }
.step { flex: 1; padding: 0 2.5mm; position: relative; }
.step:first-child { padding-left: 0; }
.step:last-child { padding-right: 0; }
.step:after { content: ''; position: absolute; right: 0; top: 1mm; width: .5pt; height: 11mm; background: ${HAIR}; }
.step:last-child:after { display: none; }
.step .n { font-size: 6pt; font-weight: 600; color: ${GREEN}; letter-spacing: .16em; margin-bottom: .8mm; }
.step .h { font-size: 7.6pt; font-weight: 600; color: ${NAVY}; line-height: 1.2; margin-bottom: .8mm; }
.step .d { font-size: 6.8pt; line-height: 1.35; color: ${MUTE}; }

.note { background: ${PAPER}; border-left: 2pt solid ${FAINT}; padding: 2.2mm 3.2mm; font-size: 7.2pt; line-height: 1.4; color: ${MUTE}; }
.note.g { border-left-color: ${GREEN}; }
.note b { color: ${BODY}; }

.band { background: ${NAVY}; color: #ffffff; padding: 4mm 5mm; border-radius: 1.6mm; }
.band h4 { font-size: 10pt; font-weight: 300; color: #ffffff; margin: 0 0 1.5mm 0; }
.band h4 b { font-weight: 600; color: #ffffff; }
.band p { font-size: 7.8pt; line-height: 1.45; color: #C3D2E3; margin: 0; }
.band b, .band strong { color: #ffffff; }
.head b, .head strong { color: #ffffff; }

/* ── aceptación ── */
.accept { border: 1pt solid ${HAIR}; border-radius: 1.6mm; padding: 3mm 4.5mm; margin-top: 2mm; page-break-inside: avoid !important; break-inside: avoid !important; }
.accept .t { font-size: 6.2pt; letter-spacing: .22em; text-transform: uppercase; color: ${GREEN}; font-weight: 600; margin-bottom: 1.2mm; }
.sigs { display: flex; margin-top: 5mm; }
.sig { flex: 1; }
.sig + .sig { margin-left: 10mm; }
.sig .line { border-top: .8pt solid ${INK}; padding-top: 1.6mm; }
.sig .nm { font-size: 8.2pt; font-weight: 600; color: ${NAVY}; }
.sig .rl { font-size: 7pt; color: ${MUTE}; margin-top: .3mm; }

/* ── pie ── */
.foot { margin-top: 4mm; padding: 2.5mm 16mm 0 16mm; border-top: .5pt solid ${HAIR};
  display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; break-inside: avoid; }
.foot .l { font-size: 6.5pt; line-height: 1.5; color: ${MUTE}; }
.foot .l b { color: ${NAVY}; font-weight: 600; display: block; font-size: 7.2pt; letter-spacing: .06em; }
.foot .r { font-size: 6.2pt; color: ${FAINT}; text-align: right; letter-spacing: .1em; text-transform: uppercase; }

.pagebreak { page-break-before: always; }

@media print {
  @page {
    size: A4 portrait;
    margin: 0 !important;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 210mm !important;
    background: #ffffff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .no-print {
    display: none !important;
  }
  .sheet {
    margin: 0 !important;
    padding: 0 0 4mm 0 !important;
    width: 210mm !important;
    max-width: 210mm !important;
    box-shadow: none !important;
  }
  .head {
    margin: 0 !important;
    width: 210mm !important;
  }
  .accept {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
`;

/* ───────────────────────── partes ───────────────────────── */

function bloqueEncabezado(q) {
  return `<div class="head">
  <svg class="grid" viewBox="0 0 794 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="rgba(255,255,255,.10)" stroke-width="1" fill="none">
      <path d="M520 0 V300"/><path d="M380 96 H794"/><path d="M640 0 V300"/>
    </g>
    <polyline points="520,60 640,150 794,100" fill="none" stroke="${GREEN}" stroke-width="2"/>
    <circle cx="520" cy="60" r="6" fill="${GREEN}"/><circle cx="640" cy="150" r="6" fill="${GREEN}"/>
  </svg>
  <div class="row">
    <img src="${logoBase64()}" alt="GSD"/>
    <div class="doc">
      <div class="lbl">${esc(q.tipoDocumento || 'Cotización de servicios')}</div>
      <div class="num">${esc(q.referencia)}</div>
    </div>
  </div>
  <h1>Cotización de <b>servicios profesionales</b></h1>
  <div class="sub">${esc(q.servicioNombre)}</div>
</div>`;
}

function bloqueDatos(q) {
  const vig = q.vigenciaHasta ? fmtFecha(q.vigenciaHasta) : '—';
  return `
<div class="sec">
  <div class="cols">
    <div>
      <div class="eyebrow">Cliente</div>
      <table class="kv">
        <tr><td class="k">Nombre</td><td class="v">${esc(q.clienteNombre)}</td></tr>
        ${q.clienteDocumento ? `<tr><td class="k">Cédula / RNC</td><td class="v">${esc(q.clienteDocumento)}</td></tr>` : ''}
        ${q.clienteEmail ? `<tr><td class="k">Correo</td><td class="v">${esc(q.clienteEmail)}</td></tr>` : ''}
        ${q.clienteTelefono ? `<tr><td class="k">Teléfono</td><td class="v">${esc(q.clienteTelefono)}</td></tr>` : ''}
        ${q.clienteDireccion ? `<tr><td class="k">Dirección</td><td class="v">${esc(q.clienteDireccion)}</td></tr>` : ''}
      </table>
    </div>
    <div>
      <div class="eyebrow">Documento</div>
      <table class="kv">
        <tr><td class="k">Referencia</td><td class="v">${esc(q.referencia)}</td></tr>
        <tr><td class="k">Fecha de emisión</td><td class="v">${fmtFecha(q.fecha)}</td></tr>
        <tr><td class="k">Vigencia hasta</td><td class="v">${vig}</td></tr>
        <tr><td class="k">División</td><td class="v">${esc(q.divisionNombre)}</td></tr>
        ${q.preparadoPor ? `<tr><td class="k">Preparado por</td><td class="v">${esc(q.preparadoPor)}</td></tr>` : ''}
      </table>
    </div>
  </div>
</div>`;
}

function bloqueAlcance(q) {
  const inc = (q.incluye || []).map((i) => `<li>${esc(i)}</li>`).join('');
  const exc = (q.noIncluye || []).map((i) => `<li>${esc(i)}</li>`).join('');
  if (!inc && !exc) return '';
  return `
<div class="sec">
  <div class="eyebrow">Alcance</div>
  <h2>Qué comprende este servicio</h2>
  <div class="rule"></div>
  ${q.descripcion ? `<p>${esc(q.descripcion)}</p>` : ''}
  <div class="cols" style="margin-top:4mm;">
    <div>
      <div class="eyebrow" style="color:${NAVY};">Incluye</div>
      <ul class="tick">${inc}</ul>
    </div>
    <div>
      <div class="eyebrow" style="color:${MUTE};">No incluye</div>
      <ul class="dash">${exc}</ul>
    </div>
  </div>
</div>`;
}

function bloqueEtapas(q) {
  if (!q.etapas || !q.etapas.length) return '';
  const st = q.etapas
    .map((e, i) => `<div class="step"><div class="n">${String(i + 1).padStart(2, '0')}</div>
      <div class="h">${esc(e.nombre)}</div><div class="d">${esc(e.alcance || '')}</div></div>`)
    .join('');
  return `
<div class="sec">
  <div class="eyebrow">Metodología</div>
  <h2>Cómo se ejecuta</h2>
  <div class="rule"></div>
  <div class="steps">${st}</div>
</div>`;
}

function bloqueHonorarios(q) {
  const filas = (q.items || [])
    .map((it) => `<tr><td class="c">${esc(it.concepto)}${it.detalle ? `<span class="sub">${esc(it.detalle)}</span>` : ''}</td>
      <td class="r">${fmtMonto(it.monto, q.moneda)}</td></tr>`)
    .join('');

  let extras = '';
  if (q.descuento && Number(q.descuento) > 0) {
    extras += `<tr class="desc"><td>Descuento aplicado${q.descuentoNota ? ` — ${esc(q.descuentoNota)}` : ''}</td>
      <td class="r">− ${fmtMonto(q.descuento, q.moneda)}</td></tr>`;
  }
  if (q.aplicaItbis) {
    extras += `<tr class="sub-t"><td>Subtotal</td><td class="r">${fmtMonto(q.subtotal, q.moneda)}</td></tr>`;
    extras += `<tr class="sub-t"><td>ITBIS (18%)</td><td class="r">${fmtMonto(q.itbis, q.moneda)}</td></tr>`;
  }

  const desglose = (q.desgloseTerceros || []).length
    ? `<div style="margin-top:7mm;">
        <div class="eyebrow" style="color:${MUTE};">Conceptos a cargo de terceros</div>
        <p style="font-size:8pt;margin-bottom:2mm;">Los siguientes montos no son honorarios de GSD. Los determinan las
        autoridades o terceros y se informan al cliente antes de incurrirlos.</p>
        <table class="money">
          <tr><th>Concepto</th><th style="width:20%;">Quién lo determina</th><th class="r" style="width:22%;">Monto</th></tr>
          ${q.desgloseTerceros.map((d) => `<tr><td class="c">${esc(d.concepto)}</td>
            <td style="font-size:8pt;color:${MUTE};">${esc(d.quien || '')}</td>
            <td class="r">${d.monto == null ? 'Según liquidación' : fmtMonto(d.monto, d.moneda || q.moneda)}</td></tr>`).join('')}
        </table>
      </div>`
    : '';

  return `
<div class="sec">
  <div class="eyebrow">Honorarios</div>
  <h2>Propuesta económica</h2>
  <div class="rule"></div>
  <table class="money">
    <tr><th>Concepto</th><th class="r" style="width:30%;">Honorario</th></tr>
    ${filas}
    ${extras}
    <tr class="tot"><td>Total${q.aplicaItbis ? ' con ITBIS' : ''}</td><td class="r">${fmtMonto(q.total, q.moneda)}</td></tr>
  </table>
  ${desglose}
  <div class="cols" style="margin-top:7mm;">
    <div>
      <div class="eyebrow" style="color:${NAVY};">Forma de pago</div>
      <p style="font-size:8.6pt;margin:0;">${esc(q.formaPago || '—')}</p>
    </div>
    <div>
      <div class="eyebrow" style="color:${NAVY};">Plazo estimado</div>
      <p style="font-size:8.6pt;margin:0;">${esc(q.plazo || '—')}</p>
    </div>
  </div>
</div>`;
}

function bloqueCondiciones(q) {
  const propias = (q.observaciones || '')
    .split('\n').map((s) => s.trim()).filter(Boolean)
    .map((s) => `<li>${esc(s)}</li>`).join('');
  const docs = (q.documentosCliente || []).length
    ? `<div style="margin-bottom:6mm;">
         <div class="eyebrow" style="color:${NAVY};">Documentos que debe aportar el cliente</div>
         <ul class="tick">${q.documentosCliente.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
       </div>` : '';
  const generales = TERMINOS_GENERALES.map((t) => `<li>${esc(t)}</li>`).join('');

  return `
<div class="sec">
  <div class="eyebrow">Condiciones</div>
  <h2>Términos de la propuesta</h2>
  <div class="rule"></div>
  ${docs}
  ${propias ? `<div style="margin-bottom:5mm;"><div class="eyebrow" style="color:${NAVY};">Observaciones particulares</div><ul class="dash">${propias}</ul></div>` : ''}
  <div class="eyebrow" style="color:${MUTE};">Términos generales</div>
  <ul class="dash">${generales}</ul>
  ${q.nota ? `<div class="note g" style="margin-top:5mm;"><b>Nota.</b> ${esc(q.nota)}</div>` : ''}
</div>`;
}

function bloqueAceptacion(q) {
  return `
<div class="sec">
  <div class="eyebrow">Aceptación</div>
  <h2>Conformidad con la propuesta</h2>
  <div class="rule"></div>
  <div class="accept">
    <div class="t">Declaración</div>
    <p style="font-size:8.6pt;margin:0;">El cliente declara haber leído y comprendido el alcance, los honorarios, los
    plazos y las exclusiones descritos en este documento, y manifiesta su conformidad para que Geosolutions Source
    Dominicana, S.R.L. inicie los trabajos aquí descritos conforme a las condiciones pactadas. La presente cotización
    tiene vigencia hasta el ${q.vigenciaHasta ? fmtFecha(q.vigenciaHasta) : 'la fecha indicada'} y no constituye
    oferta vinculante fuera de ese período.</p>
    <div class="sigs">
      <div class="sig"><div class="line">
        <div class="nm">${esc(q.clienteNombre || 'El Cliente')}</div>
        <div class="rl">${esc(q.clienteDocumento ? 'Cédula / RNC ' + q.clienteDocumento : 'El Cliente')}</div>
      </div></div>
      <div class="sig"><div class="line">
        <div class="nm">Esteban G. Mejía Pérez</div>
        <div class="rl">Abogado · Socio Gerente</div>
      </div></div>
    </div>
  </div>
</div>`;
}

function bloquePie() {
  return `
<div class="foot">
  <div class="l">
    <b>Geosolutions Source Dominicana, S.R.L.</b>
    Punta Cana, República Dominicana &nbsp;·&nbsp; RNC 1-33-79694-5<br/>
    829 493 7254 &nbsp;·&nbsp; esteban@geosolutionssource.com &nbsp;·&nbsp; www.geosolutionssource.com
  </div>
  <div class="r">Expertos en tierra</div>
</div>`;
}

/**
 * @param {object} q  cotización ya normalizada (ver normalizarCotizacion en cotizacionService)
 * @returns {string} HTML completo
 */
function plantillaCotizacion(q) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${esc(q.referencia)} — ${esc(q.clienteNombre)}</title>
<style>${CSS}</style></head><body><div class="sheet">${bloqueEncabezado(q)}<div class="body">${bloqueDatos(q)}${bloqueAlcance(q)}${bloqueEtapas(q)}${bloqueHonorarios(q)}${bloqueCondiciones(q)}${bloqueAceptacion(q)}</div>${bloquePie()}</div></body></html>`;
}

module.exports = { plantillaCotizacion, fmtMonto, fmtFecha, NAVY, GREEN };
