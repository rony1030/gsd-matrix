// scripts/seed_demo_data.js — Inyección de 8 clientes de ejemplo con cotizaciones y procesos (expedientes)
const { getDb, run, queryAll } = require('../db');

const DEMO_DATA = [
  {
    codigo: 'GSD-EXP-2026-101',
    quoteRef: 'GSD-COT-2026-101',
    cliente: {
      nombre: 'Ing. Alejandro Morales',
      empresa: 'Constructora Cap Cana S.R.L.',
      doc: '1-31-88492-3',
      tel: '(829) 555-0142',
      email: 'amorales@constructoracapcana.do',
      dir: 'Av. Boulevard Turístico del Este, Cap Cana'
    },
    servicioTipo: 'deslinde',
    servicioTitulo: 'Deslinde Catastral de Parcela 45-B con Georreferenciación GNSS',
    montoBase: 2000,
    moneda: 'USD',
    itbis: 360,
    total: 2360,
    responsable: 'Esteban Mejía',
    tecnico: 'Carlos Rodríguez',
    prioridad: 'Alta',
    estado: 'proc', // En proceso
    fechaInicio: '2026-08-15',
    fechaFin: '2026-12-15',
    objeto: {
      provincia: 'La Altagracia',
      municipio: 'Higüey',
      dm: 'Verón-Punta Cana',
      sector: 'Punta Cana',
      parcela: '45-B',
      dc: '11',
      areaReg: '850.00 m²',
      areaLev: '848.50 m²',
      matricula: '0300049281',
      titulo: 'Certificado 2019-004819',
      propietario: 'Constructora Cap Cana S.R.L.'
    },
    ubicacion: { lat: 18.5324, lng: -68.3712, direccion: 'Sector Cap Cana Marina, Solar 45-B' },
    items: [
      { concepto: 'Levantamiento topográfico de precisión GNSS', monto: 1200 },
      { concepto: 'Tramitación y representación ante Mensuras Catastrales', monto: 800 }
    ],
    observaciones: 'Levantamiento técnico con receptores GNSS de doble frecuencia y aprobación catastral.',
    pagos: [
      { d: '2026-08-15', c: 'Anticipo 50% al inicio', m: 1180, st: 'Pagado' },
      { d: '2026-12-15', c: 'Saldo final contra aprobación catastral', m: 1180, st: 'Pendiente' }
    ],
    doneTasks: 5,
    procTask: 6
  },
  {
    codigo: 'GSD-EXP-2026-102',
    quoteRef: 'GSD-COT-2026-102',
    cliente: {
      nombre: 'Dra. Carmen Valenzuela',
      empresa: 'Inversiones Bávaro del Este',
      doc: '001-0948214-5',
      tel: '(809) 555-0283',
      email: 'carmen.valenzuela@inversionesbavaro.com',
      dir: 'Residencial Playa Coral, Apto 402, Bávaro'
    },
    servicioTipo: 'transferencia',
    servicioTitulo: 'Transferencia de Título Inmobiliario · Régimen CONFOTUR',
    montoBase: 1500,
    moneda: 'USD',
    itbis: 270,
    total: 1770,
    responsable: 'Esteban Mejía',
    tecnico: 'Esteban Mejía',
    prioridad: 'Media',
    estado: 'proc',
    fechaInicio: '2026-08-28',
    fechaFin: '2026-10-15',
    objeto: {
      provincia: 'La Altagracia',
      municipio: 'Higüey',
      sector: 'Playa Bávaro',
      matricula: '0300188294',
      titulo: 'Certificado 2021-081726',
      dc: 'Distrito Catastral 11-4ta',
      areaReg: '142.50 m²',
      vendedor: 'Desarrollos Turísticos del Este S.A.',
      comprador: 'Dra. Carmen Valenzuela',
      precio: 'US$ 230,000.00'
    },
    ubicacion: { lat: 18.6881, lng: -68.4215, direccion: 'Av. Alemania, Residencial Playa Coral' },
    items: [
      { concepto: 'Due diligence y revisión de exención CONFOTUR', monto: 700 },
      { concepto: 'Gestión registral ante el Registro de Títulos de Higüey', monto: 800 }
    ],
    observaciones: 'Unidad amparada bajo ley 158-01 (CONFOTUR) con exención de impuesto de transferencia.',
    pagos: [
      { d: '2026-08-28', c: 'Honorarios totales al inicio', m: 1770, st: 'Pagado' }
    ],
    doneTasks: 4,
    procTask: 5
  },
  {
    codigo: 'GSD-EXP-2026-103',
    quoteRef: 'GSD-COT-2026-103',
    cliente: {
      nombre: 'Jean-Luc Dubois',
      empresa: 'Dubois Hospitality SRL',
      doc: '1-33-40192-8',
      tel: '(849) 555-0319',
      email: 'jldubois@caribbeanvillas.com',
      dir: 'Tortuga Bay, Villa No. 12, Punta Cana Resort'
    },
    servicioTipo: 'transferencia',
    servicioTitulo: 'Plan Compra Segura · Due Diligence & Contrato de Compraventa',
    montoBase: 3000,
    moneda: 'USD',
    itbis: 540,
    total: 3540,
    responsable: 'Esteban Mejía',
    tecnico: 'Carlos Rodríguez',
    prioridad: 'Alta',
    estado: 'rev', // En revisión
    fechaInicio: '2026-09-01',
    fechaFin: '2026-11-01',
    objeto: {
      provincia: 'La Altagracia',
      municipio: 'Higüey',
      sector: 'Punta Cana Resort & Club',
      matricula: '0300991823',
      titulo: 'Certificado 2018-091823',
      dc: 'DC 11',
      areaReg: '2,200 m²',
      vendedor: 'Inversiones Tortuga S.A.',
      comprador: 'Dubois Hospitality SRL',
      precio: 'US$ 1,450,000.00'
    },
    ubicacion: { lat: 18.5204, lng: -68.3621, direccion: 'Tortuga Bay Villa 12' },
    items: [
      { concepto: 'Due diligence registral, catastral y ambiental', monto: 1500 },
      { concepto: 'Estructuración legal y redacción de contrato compraventa', monto: 1500 }
    ],
    observaciones: 'Revisión exhaustiva de gravámenes y linderos con verificación física en campo.',
    pagos: [
      { d: '2026-09-01', c: 'Pago inicial 50%', m: 1770, st: 'Pagado' },
      { d: '2026-10-15', c: 'Saldo al cierre', m: 1770, st: 'Pendiente' }
    ],
    doneTasks: 3,
    procTask: 4
  },
  {
    codigo: 'GSD-EXP-2026-104',
    quoteRef: 'GSD-COT-2026-104',
    cliente: {
      nombre: 'Lic. Roberto Peña Gómez',
      empresa: 'Grupo Turístico Macao',
      doc: '1-32-77144-1',
      tel: '(809) 555-0455',
      email: 'r.pena@grupomacaptur.com',
      dir: 'Carretera Macao - Uvero Alto, Km 4'
    },
    servicioTipo: 'subdivision',
    servicioTitulo: 'Subdivisión de Terreno y Aprobación de Planos Catastrales',
    montoBase: 3500,
    moneda: 'USD',
    itbis: 630,
    total: 4130,
    responsable: 'Esteban Mejía',
    tecnico: 'Carlos Rodríguez',
    prioridad: 'Media',
    estado: 'proc',
    fechaInicio: '2026-07-20',
    fechaFin: '2026-11-20',
    objeto: {
      parcela: '108-A',
      provincia: 'La Altagracia',
      sector: 'Macao',
      solesResultantes: '4 solares para villas',
      areaReg: '3,450.00 m²'
    },
    ubicacion: { lat: 18.7612, lng: -68.5321, direccion: 'Parcela 108-A, Macao' },
    items: [
      { concepto: 'Levantamiento de campo geodésico y monumentación', monto: 2000 },
      { concepto: 'Elaboración de planos y tramitación catastral', monto: 1500 }
    ],
    observaciones: 'Subdivisión en 4 porciones independientes con acceso vial común.',
    pagos: [
      { d: '2026-07-20', c: 'Pago anticipo', m: 2065, st: 'Pagado' },
      { d: '2026-11-20', c: 'Pago final contra aprobación', m: 2065, st: 'Pendiente' }
    ],
    doneTasks: 4,
    procTask: 5
  },
  {
    codigo: 'GSD-EXP-2026-105',
    quoteRef: 'GSD-COT-2026-105',
    cliente: {
      nombre: 'Sra. Patricia Henderson de Guzmán',
      empresa: 'Familia Guzmán',
      doc: '028-0019482-1',
      tel: '(829) 555-0567',
      email: 'p.henderson@gmail.com',
      dir: 'Calle Los Corales No. 8, Verón'
    },
    servicioTipo: 'sucesiones',
    servicioTitulo: 'Determinación de Herederos y Transferencia Sucesoral',
    montoBase: 2500,
    moneda: 'USD',
    itbis: 450,
    total: 2950,
    responsable: 'Esteban Mejía',
    tecnico: 'Esteban Mejía',
    prioridad: 'Baja',
    estado: 'wait', // Esperando cliente
    fechaInicio: '2026-08-10',
    fechaFin: '2026-12-10',
    objeto: {
      causante: 'Sr. Ramón Guzmán Martínez',
      herederos: '4 herederos legítimos',
      bienes: '2 inmuebles en Verón y Bávaro',
      radicacion: 'Tribunal de Tierras de Higüey'
    },
    ubicacion: { lat: 18.5721, lng: -68.4419, direccion: 'Sector Verón Central' },
    items: [
      { concepto: 'Preparación de instancia y determinación de herederos', monto: 1500 },
      { concepto: 'Declaración jurada y pliego sucesoral DGII', monto: 1000 }
    ],
    observaciones: 'En espera de actas de nacimiento legalizadas de 2 coherederos residentes en el exterior.',
    pagos: [
      { d: '2026-08-10', c: 'Honorarios iniciales', m: 1475, st: 'Pagado' },
      { d: '2026-12-10', c: 'Saldo final', m: 1475, st: 'Pendiente' }
    ],
    doneTasks: 2,
    procTask: 3
  },
  {
    codigo: 'GSD-EXP-2026-106',
    quoteRef: 'GSD-COT-2026-106',
    cliente: {
      nombre: 'Desarrollos Inmobiliarios del Caribe SRL',
      empresa: 'Arq. Marcos Santana',
      doc: '1-30-99412-6',
      tel: '(809) 555-0688',
      email: 'msantana@desarrolloscaribe.do',
      dir: 'Av. España, Edif. Plaza Bávaro, Suite 301'
    },
    servicioTipo: 'condominio',
    servicioTitulo: 'Constitución de Régimen de Condominio Oasis Bay',
    montoBase: 5000,
    moneda: 'USD',
    itbis: 900,
    total: 5900,
    responsable: 'Esteban Mejía',
    tecnico: 'Carlos Rodríguez',
    prioridad: 'Alta',
    estado: 'proc',
    fechaInicio: '2026-06-15',
    fechaFin: '2026-10-30',
    objeto: {
      proyecto: 'Residencial Oasis Bay',
      unidades: '24 apartamentos y 32 parqueos',
      sector: 'Cabeza de Toro, Punta Cana',
      parcela: '12-C-Ref',
      matricula: '0300881920',
      areaTotal: '4,800.00 m²'
    },
    ubicacion: { lat: 18.6412, lng: -68.3842, direccion: 'Cabeza de Toro, Proyecto Oasis Bay' },
    items: [
      { concepto: 'Redacción de reglamento de copropiedad y administración', monto: 2500 },
      { concepto: 'Planos de división particular y deslinde de unidades', monto: 2500 }
    ],
    observaciones: 'Expediente técnico aprobado por Mensuras, en fase de emisión de títulos individuales.',
    pagos: [
      { d: '2026-06-15', c: 'Anticipo 50%', m: 2950, st: 'Pagado' },
      { d: '2026-09-05', c: 'Segundo pago contra aprobación técnica', m: 2000, st: 'Pagado' },
      { d: '2026-10-30', c: 'Saldo final entrega de títulos', m: 950, st: 'Pendiente' }
    ],
    doneTasks: 7,
    procTask: 8
  },
  {
    codigo: 'GSD-EXP-2026-107',
    quoteRef: 'GSD-COT-2026-107',
    cliente: {
      nombre: 'Klaus & Erika Becker',
      empresa: 'Becker Investments',
      doc: 'DE-C8917263',
      tel: '(849) 555-0721',
      email: 'becker.investments@web.de',
      dir: 'Cocotal Golf & Country Club, Villa 41'
    },
    servicioTipo: 'transferencia',
    servicioTitulo: 'Transferencia Inmobiliaria y Cierre Registral · Cocotal',
    montoBase: 800,
    moneda: 'USD',
    itbis: 144,
    total: 944,
    responsable: 'Esteban Mejía',
    tecnico: 'Esteban Mejía',
    prioridad: 'Baja',
    estado: 'done', // Cerrado
    fechaInicio: '2026-06-01',
    fechaFin: '2026-07-15',
    objeto: {
      provincia: 'La Altagracia',
      municipio: 'Higüey',
      sector: 'Cocotal Golf Club',
      matricula: '0300112456',
      titulo: 'Certificado 2022-004123',
      dc: 'DC 11',
      areaReg: '180.00 m²',
      vendedor: 'Palma Real Villas S.A.',
      comprador: 'Klaus Becker & Erika Becker',
      precio: 'US$ 195,000.00'
    },
    ubicacion: { lat: 18.6654, lng: -68.4112, direccion: 'Cocotal Golf Suite 2-B' },
    items: [
      { concepto: 'Transferencia de título y depósito registral', monto: 800 }
    ],
    observaciones: 'Expediente culminado con éxito. Certificado de título entregado a los clientes.',
    pagos: [
      { d: '2026-06-01', c: 'Pago completo 100%', m: 944, st: 'Pagado' }
    ],
    doneTasks: 8,
    procTask: 8
  },
  {
    codigo: 'GSD-EXP-2026-108',
    quoteRef: 'GSD-COT-2026-108',
    cliente: {
      nombre: 'Inversiones Comerciales Altagracia SRL',
      empresa: 'Lic. Félix Encarnación',
      doc: '1-33-88219-4',
      tel: '(809) 555-0899',
      email: 'felix@inversionesaltagracia.do',
      dir: 'Carretera Friusa - El Cortecito, Plaza Friusa'
    },
    servicioTipo: 'iguala',
    servicioTitulo: 'Iguala Legal Corporativa (Nivel Corporate)',
    montoBase: 2500,
    moneda: 'USD',
    itbis: 450,
    total: 2950,
    responsable: 'Esteban Mejía',
    tecnico: 'Esteban Mejía',
    prioridad: 'Media',
    estado: 'proc',
    fechaInicio: '2026-08-01',
    fechaFin: '2027-02-01',
    objeto: {
      empresa: 'Inversiones Comerciales Altagracia SRL',
      rnc: '1-33-88219-4',
      nivel: 'Corporate',
      sede: 'Friusa, Bávaro',
      contacto: 'Lic. Félix Encarnación',
      vigencia: '6 meses renovables'
    },
    ubicacion: { lat: 18.6912, lng: -68.4356, direccion: 'Plaza Friusa, Local 12' },
    items: [
      { concepto: 'Asesoría legal continua, revisión de contratos y gestión societaria', monto: 2500 }
    ],
    observaciones: 'Servicio continuo mensual. Contratos inmobiliarios, acuerdos laborales y debido cumplimiento.',
    pagos: [
      { d: '2026-08-01', c: 'Honorarios Mes 1 (Agosto)', m: 2950, st: 'Pagado' },
      { d: '2026-09-01', c: 'Honorarios Mes 2 (Septiembre)', m: 2950, st: 'Pagado' },
      { d: '2026-10-01', c: 'Honorarios Mes 3 (Octubre)', m: 2950, st: 'Pendiente' }
    ],
    doneTasks: 6,
    procTask: 7
  }
];

// Helper para tareas de expediente según plantilla
function generarTasks(svc, doneCount, procIdx) {
  const taskCatalog = {
    deslinde: [
      { id: 1, phase: 0, name: 'Recepción y validación de títulos del cliente', who: 'Esteban Mejía', due: '2026-08-20', pri: 'Alta' },
      { id: 2, phase: 0, name: 'Certificación de estado jurídico ante Registro', who: 'Esteban Mejía', due: '2026-08-25', pri: 'Media' },
      { id: 3, phase: 1, name: 'Solicitud de autorización a Mensuras Catastrales', who: 'Esteban Mejía', due: '2026-09-01', pri: 'Alta' },
      { id: 4, phase: 2, name: 'Levantamiento GNSS de campo y vértices', who: 'Carlos Rodríguez', due: '2026-09-10', pri: 'Alta' },
      { id: 5, phase: 2, name: 'Monumentación y fotografías georreferenciadas', who: 'Carlos Rodríguez', due: '2026-09-14', pri: 'Media' },
      { id: 6, phase: 3, name: 'Procesamiento de coordenadas y cálculo de área', who: 'Carlos Rodríguez', due: '2026-09-25', pri: 'Alta' },
      { id: 7, phase: 3, name: 'Elaboración de planos definitivos y memoria técnica', who: 'Carlos Rodríguez', due: '2026-10-05', pri: 'Media' },
      { id: 8, phase: 4, name: 'Depósito de expediente en Mensuras Catastrales', who: 'Esteban Mejía', due: '2026-10-20', pri: 'Alta' },
      { id: 9, phase: 5, name: 'Notificación formal a propietarios colindantes', who: 'Esteban Mejía', due: '2026-11-05', pri: 'Media' },
      { id: 10, phase: 6, name: 'Emisión de Certificado de Título Definitivo', who: 'Esteban Mejía', due: '2026-12-10', pri: 'Alta' }
    ],
    transferencia: [
      { id: 1, phase: 0, name: 'Revisión documental del inmueble y vendedor', who: 'Esteban Mejía', due: '2026-08-30', pri: 'Alta' },
      { id: 2, phase: 0, name: 'Solicitud de certificación de cargas y gravámenes', who: 'Esteban Mejía', due: '2026-09-05', pri: 'Media' },
      { id: 3, phase: 1, name: 'Constancia de IPI al día expedida por DGII', who: 'Esteban Mejía', due: '2026-09-10', pri: 'Media' },
      { id: 4, phase: 1, name: 'Redacción y notarización de contrato de venta', who: 'Esteban Mejía', due: '2026-09-18', pri: 'Alta' },
      { id: 5, phase: 2, name: 'Liquidación y pago de impuestos de transferencia', who: 'Esteban Mejía', due: '2026-09-25', pri: 'Alta' },
      { id: 6, phase: 3, name: 'Depósito físico en el Registro de Títulos', who: 'Esteban Mejía', due: '2026-10-02', pri: 'Alta' },
      { id: 7, phase: 3, name: 'Seguimiento de calificación registral', who: 'Esteban Mejía', due: '2026-10-10', pri: 'Media' },
      { id: 8, phase: 4, name: 'Retiro y entrega de nuevo título al comprador', who: 'Esteban Mejía', due: '2026-10-15', pri: 'Alta' }
    ],
    subdivision: [
      { id: 1, phase: 0, name: 'Estudio de títulos y linderos registrales', who: 'Esteban Mejía', due: '2026-07-25', pri: 'Alta' },
      { id: 2, phase: 1, name: 'Medición de campo y replanteo de parcelas', who: 'Carlos Rodríguez', due: '2026-08-05', pri: 'Alta' },
      { id: 3, phase: 1, name: 'Colocación de hitos de demarcación', who: 'Carlos Rodríguez', due: '2026-08-15', pri: 'Media' },
      { id: 4, phase: 2, name: 'Diseño de poligonales y planos individuales', who: 'Carlos Rodríguez', due: '2026-09-01', pri: 'Media' },
      { id: 5, phase: 3, name: 'Presentación formal ante Mensuras Catastrales', who: 'Esteban Mejía', due: '2026-09-28', pri: 'Alta' },
      { id: 6, phase: 4, name: 'Aprobación de subdivisión e inscripción registral', who: 'Esteban Mejía', due: '2026-11-20', pri: 'Alta' }
    ],
    condominio: [
      { id: 1, phase: 0, name: 'Análisis de licencia municipal y planos de obra', who: 'Esteban Mejía', due: '2026-06-25', pri: 'Alta' },
      { id: 2, phase: 1, name: 'Levantamiento de unidades habitacionales y áreas comunes', who: 'Carlos Rodríguez', due: '2026-07-15', pri: 'Alta' },
      { id: 3, phase: 1, name: 'Confección de planos de división horizontal', who: 'Carlos Rodríguez', due: '2026-08-05', pri: 'Media' },
      { id: 4, phase: 2, name: 'Redacción de reglamento de copropiedad de condominio', who: 'Esteban Mejía', due: '2026-08-20', pri: 'Alta' },
      { id: 5, phase: 2, name: 'Firma notarial y protocolización de estatutos', who: 'Esteban Mejía', due: '2026-09-01', pri: 'Media' },
      { id: 6, phase: 3, name: 'Depósito conjunto en Mensuras y Registro de Títulos', who: 'Esteban Mejía', due: '2026-09-15', pri: 'Alta' },
      { id: 7, phase: 3, name: 'Aprobación del régimen de condominio', who: 'Esteban Mejía', due: '2026-10-10', pri: 'Alta' },
      { id: 8, phase: 4, name: 'Emisión de certificados de títulos para 24 unidades', who: 'Esteban Mejía', due: '2026-10-30', pri: 'Alta' }
    ],
    sucesiones: [
      { id: 1, phase: 0, name: 'Recepción y cotejo de actas de defunción y nacimiento', who: 'Esteban Mejía', due: '2026-08-20', pri: 'Alta' },
      { id: 2, phase: 0, name: 'Investigación de bienes inmuebles a nombre del de cujus', who: 'Esteban Mejía', due: '2026-09-01', pri: 'Media' },
      { id: 3, phase: 1, name: 'Declaración jurada de sucesiones ante DGII', who: 'Esteban Mejía', due: '2026-10-05', pri: 'Alta' },
      { id: 4, phase: 2, name: 'Liquidación de impuesto sucesoral y exenciones', who: 'Esteban Mejía', due: '2026-11-01', pri: 'Media' },
      { id: 5, phase: 3, name: 'Sentencia de adjudicación y traspaso en Registro de Títulos', who: 'Esteban Mejía', due: '2026-12-10', pri: 'Alta' }
    ],
    iguala: [
      { id: 1, phase: 0, name: 'Auditoría legal inicial de contratos vigentes', who: 'Esteban Mejía', due: '2026-08-10', pri: 'Alta' },
      { id: 2, phase: 1, name: 'Firma de acuerdo de iguala legal corporate', who: 'Esteban Mejía', due: '2026-08-15', pri: 'Alta' },
      { id: 3, phase: 2, name: 'Revisión y actualización de contratos laborales', who: 'Esteban Mejía', due: '2026-08-30', pri: 'Media' },
      { id: 4, phase: 2, name: 'Informe legal mensual de agosto', who: 'Esteban Mejía', due: '2026-09-02', pri: 'Media' },
      { id: 5, phase: 2, name: 'Asesoría en negociación de arrendamiento comercial', who: 'Esteban Mejía', due: '2026-09-15', pri: 'Alta' },
      { id: 6, phase: 2, name: 'Informe legal mensual de septiembre', who: 'Esteban Mejía', due: '2026-10-02', pri: 'Media' },
      { id: 7, phase: 2, name: 'Actualización de registro mercantil y asamblea ordinaria', who: 'Esteban Mejía', due: '2026-10-25', pri: 'Media' }
    ]
  };

  const list = taskCatalog[svc] || taskCatalog.deslinde;
  return list.map((t, idx) => {
    let st = 'pend';
    if (idx < doneCount) st = 'done';
    else if (idx === doneCount || idx === procIdx) st = 'proc';
    return { ...t, st, desc: '' };
  });
}

async function seed() {
  await getDb();
  console.log('Iniciando inyección de 8 clientes de ejemplo con cotizaciones y procesos...');

  // Limpiar posibles ejemplos anteriores marcados como DEMO
  run("DELETE FROM leads WHERE tags LIKE '%[DEMO]%'");
  run("DELETE FROM cotizaciones WHERE referencia LIKE 'GSD-COT-2026-10%'");
  run("DELETE FROM expedientes WHERE codigo LIKE 'GSD-EXP-2026-10%'");

  for (const d of DEMO_DATA) {
    // 1. Inyectar Lead / Cliente
    run(
      `INSERT INTO leads (nombre, email, telefono, servicio, mensaje, estado, origen, tipo_cliente, is_real_estate, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))`,
      [
        d.cliente.nombre,
        d.cliente.email,
        d.cliente.tel,
        d.servicioTitulo,
        `Cliente corporativo / inversionista: ${d.cliente.empresa}. Dirección: ${d.cliente.dir}`,
        d.estado === 'done' ? 'cerrado' : 'contactado',
        'referido',
        d.cliente.empresa.includes('SRL') || d.cliente.empresa.includes('S.A.') ? 'Empresa' : 'Particular',
        d.servicioTipo === 'transferencia' || d.servicioTipo === 'condominio' ? 1 : 0,
        '[DEMO] Ejemplo inicial GSD'
      ]
    );

    // 2. Inyectar Cotización
    run(
      `INSERT INTO cotizaciones (
        referencia, cliente_nombre, cliente_doc, cliente_email, cliente_tel, cliente_dir,
        servicio_tipo, servicio_titulo, monto_base, moneda, duracion_meses, superficie_m2,
        items_json, itbis, total, estado, observaciones, fecha, vigencia_dias, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))`,
      [
        d.quoteRef,
        d.cliente.nombre,
        d.cliente.doc,
        d.cliente.email,
        d.cliente.tel,
        d.cliente.dir,
        d.servicioTipo,
        d.servicioTitulo,
        d.montoBase,
        d.moneda,
        3,
        d.objeto.areaReg ? parseFloat(d.objeto.areaReg) || 0 : 0,
        JSON.stringify(d.items),
        d.itbis,
        d.total,
        'aprobada',
        d.observaciones,
        d.fechaInicio,
        30
      ]
    );

    // 3. Inyectar Expediente / Proceso
    const tasks = generarTasks(d.servicioTipo, d.doneTasks, d.procTask);
    const docs = [
      { name: 'Cédula / RNC o Pasaporte', by: 'cliente', st: 'ok', date: d.fechaInicio, share: true },
      { name: 'Certificado de Título o Constancia Anotada', by: 'cliente', st: 'ok', date: d.fechaInicio, share: true },
      { name: 'Certificación de Estado Jurídico', by: 'gsd', st: 'ok', date: d.fechaInicio, share: true },
      { name: 'Levantamiento Técnico / Planos', by: 'gsd', st: d.doneTasks >= 4 ? 'ok' : 'wait', date: d.fechaInicio, share: true },
      { name: 'Recibo de Impuestos y Tasas', by: 'gsd', st: d.doneTasks >= 6 ? 'ok' : 'wait', date: d.fechaInicio, share: false }
    ];
    const avances = [
      {
        date: d.fechaInicio,
        title: 'Apertura formal del expediente',
        who: d.responsable,
        desc: `Expediente iniciado en base a la cotización ${d.quoteRef}. Documentación inicial cotejada.`,
        client: true
      },
      {
        date: '2026-09-02',
        title: 'Avance en gestión técnica y legal',
        who: d.responsable,
        desc: `Se ha completado la fase previa y se encuentra en tramitación activa con los organismos competentes.`,
        client: true
      }
    ];
    const log = [
      { d: `${d.fechaInicio} 09:30`, w: d.responsable, t: `Expediente ${d.codigo} creado desde cotización ${d.quoteRef}.` },
      { d: `2026-09-02 11:15`, w: d.tecnico, t: 'Revisión y validación de avances del proceso.' }
    ];

    run(
      `INSERT INTO expedientes (
        codigo, cotizacion_ref, servicio_tipo, cliente_nombre, cliente_doc, cliente_tel, cliente_email, cliente_dir,
        honorario, moneda, responsable, tecnico, prioridad, estado, fecha_inicio, fecha_fin,
        objeto_json, ubicacion_json, docs_json, tasks_json, avances_json, log_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))`,
      [
        d.codigo,
        d.quoteRef,
        d.servicioTipo,
        d.cliente.nombre,
        d.cliente.doc,
        d.cliente.tel,
        d.cliente.email,
        d.cliente.dir,
        d.montoBase,
        d.moneda,
        d.responsable,
        d.tecnico,
        d.prioridad,
        d.estado,
        d.fechaInicio,
        d.fechaFin,
        JSON.stringify(d.objeto),
        JSON.stringify(d.ubicacion),
        JSON.stringify(docs),
        JSON.stringify(tasks),
        JSON.stringify(avances),
        JSON.stringify(log)
      ]
    );

    console.log(`✅ Creado: ${d.cliente.nombre} -> Cotización: ${d.quoteRef} -> Expediente: ${d.codigo}`);
  }

  console.log('\n🎉 ¡8 clientes de ejemplo, cotizaciones y procesos creados exitosamente!');
}

seed().catch(err => {
  console.error('Error al inyectar datos de ejemplo:', err);
  process.exit(1);
});
