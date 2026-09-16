/**
 * GSD Quoter — Lógica de cotización
 *
 * Un único punto donde se calculan totales. La UI (preview en vivo) y el PDF
 * consumen esta misma función, de modo que lo que el cliente ve en pantalla y
 * lo que sale impreso no pueden divergir.
 */

const { buscarServicio, DIVISIONES } = require('./catalogoServicios');

const ITBIS_TASA = 0.18;

function redondear(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Referencia correlativa: GSD-COT-2026-001 */
function construirReferencia(anio, secuencia, prefijo = 'GSD-COT') {
  return `${prefijo}-${anio}-${String(secuencia).padStart(3, '0')}`;
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + Number(dias || 0));
  return d;
}

/**
 * Normaliza el payload del formulario y calcula todos los importes.
 * Nunca confía en los totales que llegan del cliente: los recalcula.
 */
function normalizarCotizacion(input = {}) {
  const servicioId = input.servicioId || input.servicio_tipo || '';
  const servicio = buscarServicio(servicioId) || {};
  const division = DIVISIONES.find((d) => d.id === servicio.division) || {};

  const moneda = input.moneda === 'DOP' ? 'DOP' : 'USD';

  // ── ítems ──────────────────────────────────────────────
  let items = Array.isArray(input.items) ? input.items.slice() : [];
  items = items
    .map((it) => ({
      concepto: String(it.concepto || it.desc || it.titulo || it.nombre || '').trim(),
      detalle: it.detalle ? String(it.detalle).trim() : (it.cant && Number(it.cant) > 1 ? `Cantidad: ${it.cant}` : ''),
      monto: redondear(it.monto !== undefined ? it.monto : ((Number(it.cant) || 1) * (Number(it.precio) || 0))),
    }))
    .filter((it) => it.concepto);

  // Si no llegó ningún ítem, se siembra con el honorario base del servicio o monto_base.
  if (!items.length) {
    if (servicio.base) {
      const base =
        moneda === 'DOP' && servicio.base.alterna
          ? servicio.base.alterna
          : servicio.base;
      items.push({
        concepto: servicio.nombre,
        detalle: servicio.unidad || '',
        monto: redondear(base.monto),
      });
    } else if (input.monto_base || input.monto) {
      items.push({
        concepto: servicio.nombre || input.servicioNombre || input.servicio_titulo || 'Honorarios Profesionales',
        detalle: '',
        monto: redondear(input.monto_base || input.monto || 0),
      });
    }
  }

  const bruto = redondear(items.reduce((a, it) => a + it.monto, 0));

  // ── descuento ─────────────────────────────────────────
  let descuento = 0;
  if (input.descuentoPorcentaje) {
    descuento = redondear(bruto * (Number(input.descuentoPorcentaje) / 100));
  } else if (input.descuento) {
    descuento = redondear(input.descuento);
  }
  if (descuento > bruto) descuento = bruto;

  const subtotal = redondear(bruto - descuento);

  // ── ITBIS ─────────────────────────────────────────────
  const aplicaItbis =
    input.aplicaItbis === undefined
      ? (input.itbis !== undefined ? Number(input.itbis) > 0 : Boolean(servicio.itbisPorDefecto))
      : Boolean(input.aplicaItbis);
  const itbis = aplicaItbis ? redondear(subtotal * ITBIS_TASA) : 0;
  const total = redondear(subtotal + itbis);

  // ── fechas ────────────────────────────────────────────
  const fecha = input.fecha ? new Date(input.fecha) : new Date();
  const diasVigencia = Number(input.diasVigencia || input.vigencia_dias || 30);
  const vigenciaHasta = sumarDias(fecha, diasVigencia);

  // ── alcance ───────────────────────────────────────────
  const incluye = Array.isArray(input.incluye) && input.incluye.length
    ? input.incluye
    : servicio.incluye || [];
  const noIncluye = Array.isArray(input.noIncluye) && input.noIncluye.length
    ? input.noIncluye
    : servicio.noIncluye || [];

  return {
    // identificación
    referencia: input.referencia || 'GSD-COT-____-___',
    tipoDocumento: input.tipoDocumento || 'Cotización de servicios',
    fecha,
    diasVigencia,
    vigenciaHasta,
    preparadoPor: input.preparadoPor || 'Esteban G. Mejía Pérez · Abogado · Socio Gerente',

    // cliente
    clienteNombre: input.clienteNombre || input.cliente_nombre || '',
    clienteDocumento: input.clienteDocumento || input.cliente_doc || '',
    clienteEmail: input.clienteEmail || input.cliente_email || '',
    clienteTelefono: input.clienteTelefono || input.cliente_tel || '',
    clienteDireccion: input.clienteDireccion || input.cliente_dir || '',

    // servicio
    servicioId: servicio.id || servicioId,
    servicioNombre: servicio.nombre || input.servicioNombre || input.servicio_titulo || '',
    divisionId: division.id || '',
    divisionNombre: division.nombre || '',
    descripcion: input.descripcion || '',
    incluye,
    noIncluye,
    etapas: input.etapas || servicio.etapas || null,
    documentosCliente: input.documentosCliente || servicio.documentosCliente || [],
    plazo: input.plazo || servicio.plazo || '',
    formaPago: input.formaPago || servicio.pago || '',
    nota: input.nota || servicio.nota || '',

    // dinero
    moneda,
    items,
    bruto,
    descuento,
    descuentoNota: input.descuentoNota || '',
    subtotal,
    aplicaItbis,
    itbis,
    total,
    // Solo conceptos de terceros: el honorario de GSD ya figura en la propuesta
    // económica, y repetirlo aquí haría creer al cliente que lo paga dos veces.
    desgloseTerceros: (input.desgloseTerceros || servicio.desglose || [])
      .filter((d) => d && d.quien !== 'GSD'),

    // libre
    observaciones: input.observaciones || '',

    // campos específicos del servicio (superficie, designación catastral, etc.)
    datosServicio: input.datosServicio || {},
  };
}

module.exports = {
  ITBIS_TASA,
  normalizarCotizacion,
  construirReferencia,
  redondear,
  sumarDias,
};
