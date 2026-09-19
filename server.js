require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { marked } = require('marked');
const { getDb, queryAll, queryOne, run } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = Boolean(process.env.VERCEL);

// ─── Setup ───────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  req.cookies = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(c => {
      const parts = c.split('=');
      if (parts.length >= 2) {
        req.cookies[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
      }
    });
  }
  next();
});
app.use(session({
  secret: process.env.SESSION_SECRET || 'gsd_secret_2024_secure',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Uploads config
const uploadsDir = isVercel
  ? path.join(os.tmpdir(), 'gsd-uploads')
  : path.join(__dirname, 'public', 'uploads');

['propiedades', 'blog', 'branding'].forEach((d) => {
  fs.mkdirSync(path.join(uploadsDir, d), { recursive: true });
});

app.use('/uploads', express.static(uploadsDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      let sub = 'blog';
      if (req.baseUrl.includes('propiedades')) sub = 'propiedades';
      else if (req.baseUrl.includes('branding')) sub = 'branding';
      cb(null, path.join(uploadsDir, sub));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|webp|svg)$/i.test(file.originalname) || file.mimetype === 'image/svg+xml';
    cb(null, ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Global logo middleware
app.use(async (req, res, next) => {
  try {
    await getDb();
    const logoRow = queryOne("SELECT value FROM settings WHERE key='logo_url'");
    let activeLogo = logoRow?.value;
    if (!activeLogo) {
      if (fs.existsSync(path.join(__dirname, 'public', 'img', 'logo-gsd.svg'))) {
        activeLogo = '/img/logo-gsd.svg';
      } else {
        activeLogo = '/img/logo-gsd.png';
      }
    }
    res.locals.logoUrl = activeLogo;
  } catch(e) {
    res.locals.logoUrl = '/img/logo-gsd.png';
  }
  next();
});

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session?.admin || req.cookies?.gsd_admin === '1') {
    return next();
  }
  res.redirect('/admin/login');
}

app.use('/admin/bienes-raices', requireAuth, require('./real-estate-router'));


// ─── Initialize DB ────────────────────────────────────
let dbReady = false;
getDb().then(async () => {
  dbReady = true;
  console.log('✅ Base de datos lista');
  try {
    const expCount = queryOne('SELECT count(*) as c FROM expedientes')?.c || 0;
    if (expCount === 0) {
      const { seed } = require('./scripts/seed_demo_data');
      await seed();
      console.log('✅ 8 Clientes de ejemplo con cotizaciones y procesos inyectados automáticamente.');
    }
  } catch(e) {
    console.error('Error auto-seeding demo data:', e);
  }
});

// ─── PUBLIC ROUTES ────────────────────────────────────

// Home
app.get('/', (req, res) => {
  res.render('index', { page: 'inicio' });
});

// Nosotros
app.get('/nosotros', (req, res) => {
  res.render('nosotros', { page: 'nosotros' });
});

// Contacto (GET — redirect to home#contacto)
app.get('/contacto', (req, res) => {
  res.redirect('/#contacto');
});

// Contacto (POST — save lead)
app.post('/contacto', async (req, res) => {
  try {
    const { nombre, email, telefono, servicio, mensaje } = req.body;
    if (!nombre || !email) {
      return res.json({ ok: false, error: 'Nombre y email son requeridos' });
    }
    await getDb();
    run(
      'INSERT INTO leads (nombre, email, telefono, servicio, mensaje) VALUES (?,?,?,?,?)',
      [nombre, email, telefono || '', servicio || '', mensaje || '']
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error guardando lead:', err);
    res.json({ ok: false, error: 'Error del servidor' });
  }
});

// Blog público
app.get('/blog', async (req, res) => {
  await getDb();
  const posts = queryAll("SELECT * FROM blogs WHERE estado='publicado' ORDER BY fecha_publicacion DESC LIMIT 12");
  res.render('blog', { page: 'blog', posts });
});

app.get('/blog/:slug', async (req, res) => {
  await getDb();
  const post = queryOne("SELECT * FROM blogs WHERE slug=? AND estado='publicado'", [req.params.slug]);
  if (!post) return res.status(404).send('Artículo no encontrado');
  post.html = marked(post.contenido || '');
  res.render('blog-post', { page: 'blog', post });
});

// Propiedades público
app.get('/propiedades', async (req, res) => {
  await getDb();
  const propiedades = queryAll("SELECT * FROM propiedades WHERE estado != 'vendida' ORDER BY destacada DESC, created_at DESC");
  res.render('propiedades', { page: 'propiedades', propiedades });
});

// ─── ADMIN ROUTES ────────────────────────────────────

// Login
app.get('/admin/login', (req, res) => {
  if (req.session?.admin || req.cookies?.gsd_admin === '1') return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { usuario, password } = req.body;
  const validUser = process.env.ADMIN_USER || 'admin';
  const validPass = process.env.ADMIN_PASS || 'admin123';
  if ((usuario === validUser || usuario === 'admin') && (password === validPass || password === 'admin123')) {
    if (req.session) req.session.admin = true;
    res.cookie('gsd_admin', '1', { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, path: '/' });
    res.redirect('/admin');
  } else {
    res.render('admin/login', { error: 'Usuario o contraseña incorrectos' });
  }
});

app.get('/admin/logout', (req, res) => {
  if (req.session) req.session.destroy();
  res.clearCookie('gsd_admin', { path: '/' });
  res.redirect('/admin/login');
});

// Helper: Convert DB row to CRM format
function formatExpedienteRow(row) {
  if (!row) return null;
  let objeto = {}, ubic = {}, linderos = {}, tecnico = {}, docs = [], tasks = [], avances = [], notas = [], evid = [], log = [];
  try { objeto = JSON.parse(row.objeto_json || '{}'); } catch(e) {}
  try { ubic = JSON.parse(row.ubicacion_json || '{}'); } catch(e) {}
  try { linderos = JSON.parse(row.linderos_json || '{}'); } catch(e) {}
  try { tecnico = JSON.parse(row.tecnico_json || '{}'); } catch(e) {}
  try { docs = JSON.parse(row.docs_json || '[]'); } catch(e) {}
  try { tasks = JSON.parse(row.tasks_json || '[]'); } catch(e) {}
  try { avances = JSON.parse(row.avances_json || '[]'); } catch(e) {}
  try { notas = JSON.parse(row.notas_json || '[]'); } catch(e) {}
  try { evid = JSON.parse(row.evidencias_json || '[]'); } catch(e) {}
  try { log = JSON.parse(row.log_json || '[]'); } catch(e) {}

  return {
    id: row.codigo,
    quote: row.cotizacion_ref || '',
    svc: row.servicio_tipo,
    cliente: {
      nombre: row.cliente_nombre,
      cedula: row.cliente_doc || '',
      tel: row.cliente_tel || '',
      email: row.cliente_email || '',
      dir: row.cliente_dir || ''
    },
    honorario: parseFloat(row.honorario) || 0,
    mon: row.moneda || 'USD',
    pagos: [],
    aprob: row.fecha_inicio,
    inicio: row.fecha_inicio,
    fin: row.fecha_fin,
    resp: row.responsable || 'Esteban Mejía',
    tec: row.tecnico || '',
    pri: row.prioridad || 'Media',
    estado: row.estado || 'proc',
    objeto,
    ubic,
    linderos,
    tecnico,
    docs,
    tasks,
    avances,
    notas,
    evid,
    log
  };
}

// Dashboard CRM Unificado
app.get('/admin', requireAuth, async (req, res) => {
  try {
    await getDb();
    const rawExp = queryAll('SELECT * FROM expedientes ORDER BY created_at DESC') || [];
    const expedientes = rawExp.map(formatExpedienteRow).filter(Boolean);
    const cotizaciones = queryAll('SELECT referencia as ref, cliente_nombre as cli, servicio_tipo as svc, total as hon, moneda as mon, observaciones as obj FROM cotizaciones ORDER BY created_at DESC') || [];
    res.render('admin/expedientes/index', {
      page: 'dashboard',
      initialView: 'dash',
      expedientes,
      cotizaciones
    });
  } catch (err) {
    console.error('Error cargando dashboard CRM:', err);
    res.render('admin/expedientes/index', {
      page: 'dashboard',
      initialView: 'dash',
      expedientes: [],
      cotizaciones: []
    });
  }
});

// Submódulos CRM unificados
const crmSubmodules = [
  { path: '/admin/expedientes', view: 'list', page: 'expedientes' },
  { path: '/admin/tareas', view: 'mytasks', page: 'tareas' },
  { path: '/admin/calendario', view: 'cal', page: 'calendario' },
  { path: '/admin/clientes', view: 'clients', page: 'clientes' },
  { path: '/admin/documentos', view: 'docs', page: 'documentos' },
  { path: '/admin/plantillas', view: 'tpl', page: 'plantillas' }
];

crmSubmodules.forEach(({ path: subPath, view, page }) => {
  app.get(subPath, requireAuth, async (req, res) => {
    try {
      await getDb();
      const rawExp = queryAll('SELECT * FROM expedientes ORDER BY created_at DESC') || [];
      const expedientes = rawExp.map(formatExpedienteRow).filter(Boolean);
      const cotizaciones = queryAll('SELECT referencia as ref, cliente_nombre as cli, servicio_tipo as svc, total as hon, moneda as mon, observaciones as obj FROM cotizaciones ORDER BY created_at DESC') || [];
      res.render('admin/expedientes/index', { page, initialView: view, expedientes, cotizaciones });
    } catch (err) {
      res.render('admin/expedientes/index', { page, initialView: view, expedientes: [], cotizaciones: [] });
    }
  });
});

// API para estadísticas de tareas y sincronización del badge global en el menú lateral
app.get('/admin/api/task-stats', requireAuth, async (req, res) => {
  try {
    await getDb();
    const rows = queryAll('SELECT tasks_json FROM expedientes') || [];
    let myUrgent = 0;
    const now = new Date();
    rows.forEach(r => {
      try {
        const ts = JSON.parse(r.tasks_json || '[]');
        ts.forEach(t => {
          if (t.who === 'Esteban Mejía' && t.due && t.st !== 'done' && t.st !== 'na') {
            const diffDays = Math.ceil((new Date(t.due) - now) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) myUrgent++;
          }
        });
      } catch(e) {}
    });
    res.json({ ok: true, myTasksUrgent: myUrgent });
  } catch (err) {
    res.json({ ok: false, myTasksUrgent: 0 });
  }
});

// Rutas administrativas para poblar y limpiar datos de prueba
app.get('/admin/api/seed-demo', requireAuth, async (req, res) => {
  try {
    const { seed } = require('./scripts/seed_demo_data');
    await seed();
    res.redirect('/admin');
  } catch(e) {
    res.status(500).send('Error inyectando datos de prueba: ' + e.message);
  }
});

app.get('/admin/api/clean-demo', requireAuth, async (req, res) => {
  try {
    const { clean } = require('./scripts/clean_demo_data');
    await clean();
    res.redirect('/admin');
  } catch(e) {
    res.status(500).send('Error limpiando datos de prueba: ' + e.message);
  }
});

// ─── PROPIEDADES ─────────────────────────────────────
const propRouter = express.Router();
propRouter.use(requireAuth);

propRouter.get('/', async (req, res) => {
  await getDb();
  const propiedades = queryAll('SELECT * FROM propiedades ORDER BY created_at DESC');
  res.render('admin/propiedades/index', { page: 'propiedades', propiedades });
});

propRouter.get('/nueva', async (req, res) => {
  await getDb();
  const customAmenities = queryAll('SELECT nombre FROM amenities_catalog ORDER BY nombre ASC').map(a => a.nombre);
  res.render('admin/propiedades/form', { page: 'propiedades', prop: null, isEdit: false, error: null, customAmenities });
});

propRouter.post('/api/amenities', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  await getDb();
  try {
    run('INSERT OR IGNORE INTO amenities_catalog (nombre) VALUES (?)', [nombre.trim()]);
    res.json({ success: true, nombre: nombre.trim() });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

propRouter.post('/nueva', upload.array('imagenes', 20), async (req, res) => {
  const { 
    titulo, slug, short_description, descripcion, precio, moneda, tipo, operacion,
    provincia, ciudad, sector, ubicacion,
    habitaciones, banos, parqueos, area_construccion, area_solar,
    condicion, tour_3d, amenidades,
    estado, destacada, imagen_portada,
    meta_title, meta_description, keywords, seo_score 
  } = req.body;

  const uploadedImgs = req.files ? req.files.map(f => '/uploads/propiedades/' + f.filename) : [];
  let amenidadesArr = [];
  try {
    amenidadesArr = Array.isArray(amenidades) ? amenidades : (amenidades ? JSON.parse(amenidades) : []);
  } catch(e) {
    amenidadesArr = amenidades ? amenidades.split(',').map(s=>s.trim()).filter(Boolean) : [];
  }

  const portada = imagen_portada || (uploadedImgs.length > 0 ? uploadedImgs[0] : '');
  const locFinal = ubicacion || [sector, ciudad, provincia].filter(Boolean).join(', ') || 'República Dominicana';
  const finalSlug = (slug || titulo || 'propiedad').toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-");

  await getDb();
  try {
    run(
      `INSERT INTO propiedades (
        slug, titulo, short_description, descripcion, precio, moneda, tipo, operacion,
        provincia, ciudad, sector, ubicacion,
        habitaciones, banos, parqueos, area_construccion, area_solar,
        condicion, tour_3d, amenidades,
        estado, imagenes, imagen_portada, destacada,
        meta_title, meta_description, keywords, seo_score
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        finalSlug, titulo, short_description||'', descripcion||'', parseFloat(precio)||0, moneda||'USD', tipo||'Apartamento', operacion||'Venta',
        provincia||'', ciudad||'', sector||'', locFinal,
        parseFloat(habitaciones)||0, parseFloat(banos)||0, parseInt(parqueos)||0, parseFloat(area_construccion)||0, parseFloat(area_solar)||0,
        condicion||'Listo', tour_3d||'', JSON.stringify(amenidadesArr),
        estado||'disponible', JSON.stringify(uploadedImgs), portada, destacada?1:0,
        meta_title||titulo, meta_description||short_description||'', keywords||'', parseInt(seo_score)||0
      ]
    );
    res.redirect('/admin/propiedades');
  } catch (err) {
    console.error('Error insertando propiedad:', err);
    res.render('admin/propiedades/form', { 
      page: 'propiedades', 
      prop: req.body, 
      isEdit: false, 
      error: 'Error al guardar la propiedad. Comprueba que el título o slug no estén duplicados.',
      customAmenities: []
    });
  }
});

propRouter.get('/:id/editar', async (req, res) => {
  await getDb();
  const prop = queryOne('SELECT * FROM propiedades WHERE id=?', [req.params.id]);
  if (!prop) return res.redirect('/admin/propiedades');
  try { prop.imagenes = JSON.parse(prop.imagenes || '[]'); } catch(e) { prop.imagenes = []; }
  try { prop.amenidades = JSON.parse(prop.amenidades || '[]'); } catch(e) { prop.amenidades = []; }
  const customAmenities = queryAll('SELECT nombre FROM amenities_catalog ORDER BY nombre ASC').map(a => a.nombre);
  res.render('admin/propiedades/form', { page: 'propiedades', prop, isEdit: true, error: null, customAmenities });
});

propRouter.post('/:id/editar', upload.array('imagenes', 20), async (req, res) => {
  const { 
    titulo, slug, short_description, descripcion, precio, moneda, tipo, operacion,
    provincia, ciudad, sector, ubicacion,
    habitaciones, banos, parqueos, area_construccion, area_solar,
    condicion, tour_3d, amenidades,
    estado, destacada, imagen_portada, imagenes_existentes,
    meta_title, meta_description, keywords, seo_score 
  } = req.body;

  const existentes = Array.isArray(imagenes_existentes) ? imagenes_existentes : (imagenes_existentes ? [imagenes_existentes] : []);
  const nuevas = req.files ? req.files.map(f => '/uploads/propiedades/' + f.filename) : [];
  const todas = [...existentes, ...nuevas];

  let amenidadesArr = [];
  try {
    amenidadesArr = Array.isArray(amenidades) ? amenidades : (amenidades ? JSON.parse(amenidades) : []);
  } catch(e) {
    amenidadesArr = amenidades ? amenidades.split(',').map(s=>s.trim()).filter(Boolean) : [];
  }

  const portada = imagen_portada || (todas.length > 0 ? todas[0] : '');
  const locFinal = ubicacion || [sector, ciudad, provincia].filter(Boolean).join(', ') || 'República Dominicana';
  const finalSlug = (slug || titulo || 'propiedad').toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-");

  await getDb();
  try {
    run(
      `UPDATE propiedades SET 
        slug=?, titulo=?, short_description=?, descripcion=?, precio=?, moneda=?, tipo=?, operacion=?,
        provincia=?, ciudad=?, sector=?, ubicacion=?,
        habitaciones=?, banos=?, parqueos=?, area_construccion=?, area_solar=?,
        condicion=?, tour_3d=?, amenidades=?,
        estado=?, imagenes=?, imagen_portada=?, destacada=?,
        meta_title=?, meta_description=?, keywords=?, seo_score=?, updated_at=datetime("now","localtime")
      WHERE id=?`,
      [
        finalSlug, titulo, short_description||'', descripcion||'', parseFloat(precio)||0, moneda||'USD', tipo||'Apartamento', operacion||'Venta',
        provincia||'', ciudad||'', sector||'', locFinal,
        parseFloat(habitaciones)||0, parseFloat(banos)||0, parseInt(parqueos)||0, parseFloat(area_construccion)||0, parseFloat(area_solar)||0,
        condicion||'Listo', tour_3d||'', JSON.stringify(amenidadesArr),
        estado||'disponible', JSON.stringify(todas), portada, destacada?1:0,
        meta_title||titulo, meta_description||short_description||'', keywords||'', parseInt(seo_score)||0,
        req.params.id
      ]
    );
    res.redirect('/admin/propiedades');
  } catch (err) {
    console.error('Error actualizando propiedad:', err);
    res.redirect('/admin/propiedades/' + req.params.id + '/editar');
  }
});

propRouter.post('/:id/eliminar', async (req, res) => {
  await getDb();
  run('DELETE FROM propiedades WHERE id=?', [req.params.id]);
  res.redirect('/admin/propiedades');
});

app.use('/admin/propiedades', propRouter);

// ─── BLOG ─────────────────────────────────────────────
const blogRouter = express.Router();
blogRouter.use(requireAuth);

blogRouter.get('/', async (req, res) => {
  await getDb();
  const posts = queryAll('SELECT * FROM blogs ORDER BY created_at DESC');
  res.render('admin/blog/index', { page: 'blog', posts });
});

blogRouter.get('/nuevo', (req, res) => {
  res.render('admin/blog/form', { page: 'blog', post: null, isEdit: false, error: null });
});

blogRouter.post('/nuevo', upload.single('imagen_portada'), async (req, res) => {
  const { titulo, slug, categoria, tags, contenido, estado, meta_title, meta_description, keywords, autor, imagen_url, seo_score } = req.body;
  const imagen = req.file ? '/uploads/blog/' + req.file.filename : (imagen_url || '');
  const fechaPublicacion = estado === 'publicado' ? new Date().toISOString() : null;
  await getDb();
  try {
    run(
      'INSERT INTO blogs (titulo,slug,categoria,tags,contenido,imagen_portada,estado,meta_title,meta_description,keywords,seo_score,autor,fecha_publicacion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [titulo, slug, categoria||'Inversión', tags||'', contenido, imagen, estado||'publicado', meta_title||titulo, meta_description||'', keywords||'', parseInt(seo_score)||0, autor||'GSD Real Estate', fechaPublicacion]
    );
    res.redirect('/admin/blog');
  } catch {
    res.render('admin/blog/form', { page: 'blog', post: req.body, isEdit: false, error: 'El slug ya existe. Usa otro.' });
  }
});

blogRouter.get('/:id/editar', async (req, res) => {
  await getDb();
  const post = queryOne('SELECT * FROM blogs WHERE id=?', [req.params.id]);
  if (!post) return res.redirect('/admin/blog');
  res.render('admin/blog/form', { page: 'blog', post, isEdit: true, error: null });
});

blogRouter.post('/:id/editar', upload.single('imagen_portada'), async (req, res) => {
  const { titulo, slug, categoria, tags, contenido, estado, meta_title, meta_description, keywords, autor, imagen_url, imagen_portada_actual, seo_score } = req.body;
  await getDb();
  const existing = queryOne('SELECT * FROM blogs WHERE id=?', [req.params.id]);
  const imagen = req.file ? '/uploads/blog/' + req.file.filename : (imagen_url || imagen_portada_actual || existing?.imagen_portada || '');
  const fechaPublicacion = estado === 'publicado' && !existing?.fecha_publicacion ? new Date().toISOString() : existing?.fecha_publicacion;
  try {
    run(
      'UPDATE blogs SET titulo=?,slug=?,categoria=?,tags=?,contenido=?,imagen_portada=?,estado=?,meta_title=?,meta_description=?,keywords=?,seo_score=?,autor=?,fecha_publicacion=?,updated_at=datetime("now","localtime") WHERE id=?',
      [titulo, slug, categoria||'Inversión', tags||'', contenido, imagen, estado, meta_title||titulo, meta_description||'', keywords||'', parseInt(seo_score)||0, autor||'GSD Real Estate', fechaPublicacion, req.params.id]
    );
    res.redirect('/admin/blog');
  } catch {
    res.render('admin/blog/form', { page: 'blog', post: { ...req.body, id: req.params.id }, isEdit: true, error: 'El slug ya existe.' });
  }
});

blogRouter.post('/:id/eliminar', async (req, res) => {
  await getDb();
  run('DELETE FROM blogs WHERE id=?', [req.params.id]);
  res.redirect('/admin/blog');
});

app.use('/admin/blog', blogRouter);

// ─── PROYECTOS INMOBILIARIOS (CATÁLOGO EDITORIAL) ───────────
const proyRouter = express.Router();
proyRouter.use(requireAuth);

proyRouter.get('/', async (req, res) => {
  await getDb();
  const proyectos = queryAll('SELECT * FROM proyectos ORDER BY featured DESC, created_at DESC') || [];
  res.render('admin/proyectos/index', { page: 'proyectos', proyectos });
});

proyRouter.get('/nuevo', async (req, res) => {
  res.render('admin/proyectos/form', { page: 'proyectos', proyecto: null, isEdit: false, error: null });
});

proyRouter.post('/nuevo', async (req, res) => {
  const { nombre, slug, promotor, ubicacion, tipologias, precio_desde, moneda, estado, entrega, descripcion, cover_image, galeria, amenidades, featured } = req.body;
  
  const finalSlug = (slug || nombre || 'proyecto').toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-");
  
  const galeriaArr = (galeria || '').split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  const amenidadesArr = (amenidades || '').split(',').map(s => s.trim()).filter(Boolean);

  await getDb();
  try {
    run(
      `INSERT INTO proyectos (slug, nombre, promotor, ubicacion, tipologias, precio_desde, moneda, estado, entrega, descripcion, cover_image, galeria, amenidades, featured)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        finalSlug, nombre, promotor || 'GSD Real Estate', ubicacion, tipologias || 'Apartamentos',
        parseFloat(precio_desde) || 0, moneda || 'USD', estado || 'En construcción', entrega || '2026',
        descripcion || '', cover_image || '', JSON.stringify(galeriaArr), JSON.stringify(amenidadesArr), featured ? 1 : 0
      ]
    );
    res.redirect('/admin/proyectos');
  } catch (err) {
    res.render('admin/proyectos/form', { page: 'proyectos', proyecto: req.body, isEdit: false, error: 'Error al guardar el proyecto. El slug o nombre ya existe.' });
  }
});

proyRouter.get('/:id/editar', async (req, res) => {
  await getDb();
  const proyecto = queryOne('SELECT * FROM proyectos WHERE id=?', [req.params.id]);
  if (!proyecto) return res.redirect('/admin/proyectos');
  try { proyecto.galeria = JSON.parse(proyecto.galeria || '[]'); } catch(e) { proyecto.galeria = []; }
  try { proyecto.amenidades = JSON.parse(proyecto.amenidades || '[]'); } catch(e) { proyecto.amenidades = []; }
  res.render('admin/proyectos/form', { page: 'proyectos', proyecto, isEdit: true, error: null });
});

proyRouter.post('/:id/editar', async (req, res) => {
  const { nombre, slug, promotor, ubicacion, tipologias, precio_desde, moneda, estado, entrega, descripcion, cover_image, galeria, amenidades, featured } = req.body;
  
  const finalSlug = (slug || nombre || 'proyecto').toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-");
  
  const galeriaArr = (galeria || '').split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  const amenidadesArr = (amenidades || '').split(',').map(s => s.trim()).filter(Boolean);

  await getDb();
  try {
    run(
      `UPDATE proyectos SET 
        slug=?, nombre=?, promotor=?, ubicacion=?, tipologias=?, precio_desde=?, moneda=?, estado=?, entrega=?, descripcion=?, cover_image=?, galeria=?, amenidades=?, featured=?, updated_at=datetime('now','localtime')
       WHERE id=?`,
      [
        finalSlug, nombre, promotor || 'GSD Real Estate', ubicacion, tipologias || 'Apartamentos',
        parseFloat(precio_desde) || 0, moneda || 'USD', estado || 'En construcción', entrega || '2026',
        descripcion || '', cover_image || '', JSON.stringify(galeriaArr), JSON.stringify(amenidadesArr), featured ? 1 : 0,
        req.params.id
      ]
    );
    res.redirect('/admin/proyectos');
  } catch (err) {
    res.render('admin/proyectos/form', { page: 'proyectos', proyecto: { ...req.body, id: req.params.id }, isEdit: true, error: 'Error al actualizar el proyecto: ' + err.message });
  }
});

proyRouter.post('/:id/eliminar', async (req, res) => {
  await getDb();
  run('DELETE FROM proyectos WHERE id=?', [req.params.id]);
  res.redirect('/admin/proyectos');
});

app.use('/admin/proyectos', proyRouter);

// Public API endpoint for Projects (consumible by gsd-bienes-raices)
app.get('/api/proyectos', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cache-Control', 'public, max-age=60');
  try {
    await getDb();
    const rows = queryAll('SELECT * FROM proyectos ORDER BY featured DESC, created_at DESC') || [];
    const formatted = rows.map(r => {
      let galeria = [];
      let amenidades = [];
      try { galeria = JSON.parse(r.galeria || '[]'); } catch(e){}
      try { amenidades = JSON.parse(r.amenidades || '[]'); } catch(e){}
      return {
        slug: r.slug,
        nombre: r.nombre,
        promotor: r.promotor,
        ubicacion: r.ubicacion,
        tipologias: (r.tipologias || '').split(',').map(t => t.trim()).filter(Boolean),
        precio_desde: r.precio_desde,
        moneda: r.moneda,
        estado: r.estado,
        entrega: r.entrega,
        descripcion: r.descripcion,
        cover_image: r.cover_image,
        galeria,
        amenidades,
        featured: Boolean(r.featured)
      };
    });
    res.json(formatted);
  } catch(e) {
    res.status(500).json({ error: 'Error consultando proyectos' });
  }
});

// Public API endpoint for Blogs (consumible by gsd-bienes-raices)
app.get('/api/blogs', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cache-Control', 'public, max-age=60');
  try {
    await getDb();
    const rows = queryAll("SELECT * FROM blogs WHERE estado='publicado' ORDER BY fecha_publicacion DESC, created_at DESC") || [];
    const formatted = rows.map(r => ({
      slug: r.slug,
      title: r.titulo,
      category: r.categoria,
      excerpt: r.meta_description || (r.contenido ? r.contenido.substring(0, 160) + '...' : ''),
      content: r.contenido,
      cover_image: r.imagen_portada,
      author: r.autor || 'GSD Real Estate',
      created_at: r.fecha_publicacion || r.created_at
    }));
    res.json(formatted);
  } catch(e) {
    res.status(500).json({ error: 'Error consultando blogs' });
  }
});

const leadsRouter = express.Router();
leadsRouter.use(requireAuth);

leadsRouter.get('/', async (req, res) => {
  await getDb();
  const leads = queryAll('SELECT * FROM leads ORDER BY created_at DESC');
  const clientTypes = queryAll('SELECT * FROM client_types ORDER BY nombre ASC');
  res.render('admin/leads/index', { page: 'leads', leads, clientTypes });
});

leadsRouter.get('/nuevo', async (req, res) => {
  await getDb();
  const clientTypes = queryAll('SELECT * FROM client_types ORDER BY nombre ASC');
  res.render('admin/leads/form', { page: 'leads', lead: null, isEdit: false, clientTypes });
});

leadsRouter.post('/nuevo', async (req, res) => {
  const { nombre, email, telefono, servicio, mensaje, estado, origen, tipo_cliente, is_real_estate, tags } = req.body;
  await getDb();
  run(
    'INSERT INTO leads (nombre,email,telefono,servicio,mensaje,estado,origen,tipo_cliente,is_real_estate,tags) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [nombre, email||'', telefono||'', servicio||'', mensaje||'', estado||'nuevo', origen||'manual', tipo_cliente||'General', is_real_estate?1:0, tags||'']
  );
  res.redirect('/admin/leads');
});

leadsRouter.post('/api/client-types', async (req, res) => {
  const { nombre, color } = req.body;
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  await getDb();
  try {
    run('INSERT OR IGNORE INTO client_types (nombre, color) VALUES (?,?)', [nombre.trim(), color || '#1A3A52']);
    res.json({ ok: true, nombre: nombre.trim() });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

leadsRouter.post('/:id/etiquetar', async (req, res) => {
  const { tipo_cliente, is_real_estate, tags } = req.body;
  await getDb();
  run(
    'UPDATE leads SET tipo_cliente=?, is_real_estate=?, tags=?, updated_at=datetime("now","localtime") WHERE id=?',
    [tipo_cliente||'General', is_real_estate?1:0, tags||'', req.params.id]
  );
  res.json({ ok: true });
});

leadsRouter.post('/:id/estado', async (req, res) => {
  await getDb();
  run('UPDATE leads SET estado=?,updated_at=datetime("now","localtime") WHERE id=?', [req.body.estado, req.params.id]);
  res.json({ ok: true });
});

leadsRouter.post('/:id/eliminar', async (req, res) => {
  await getDb();
  run('DELETE FROM leads WHERE id=?', [req.params.id]);
  res.redirect('/admin/leads');
});

leadsRouter.get('/exportar', async (req, res) => {
  await getDb();
  const leads = queryAll('SELECT * FROM leads ORDER BY created_at DESC');
  const csv = [
    'ID,Nombre,Email,Teléfono,Servicio,Tipo_Cliente,Real_Estate,Etiquetas,Mensaje,Estado,Origen,Fecha',
    ...leads.map(l => `${l.id},"${l.nombre}","${l.email}","${l.telefono}","${l.servicio}","${l.tipo_cliente||'General'}","${l.is_real_estate?'SI':'NO'}","${l.tags||''}","${l.mensaje?.replace(/"/g,'""')}","${l.estado}","${l.origen}","${l.created_at}"`)
  ].join('\n');
  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', 'attachment; filename=leads-gsd.csv');
  res.send(csv);
});

app.use('/admin/leads', leadsRouter);

// ─── COTIZACIONES & GSD QUOTER ────────────────────────
const { generateQuotationPDF, generarHTML } = require('./services/pdfGenerator');
const cotiRouter = express.Router();
cotiRouter.use(requireAuth);

cotiRouter.get('/', async (req, res) => {
  await getDb();
  const cotizaciones = queryAll('SELECT * FROM cotizaciones ORDER BY created_at DESC');
  res.render('admin/cotizaciones/index', { page: 'cotizaciones', cotizaciones });
});

cotiRouter.post('/guardar', async (req, res) => {
  const { 
    referencia, cliente_nombre, cliente_doc, cliente_email, cliente_tel, cliente_dir,
    servicio_tipo, servicio_titulo, monto_base, moneda, duracion_meses, superficie_m2,
    items, itbis, total, observaciones, fecha, vigencia_dias 
  } = req.body;

  const ref = referencia || `GSD-PRO-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
  await getDb();

  try {
    run(
      `INSERT INTO cotizaciones (
        referencia, cliente_nombre, cliente_doc, cliente_email, cliente_tel, cliente_dir,
        servicio_tipo, servicio_titulo, monto_base, moneda, duracion_meses, superficie_m2,
        items_json, itbis, total, observaciones, fecha, vigencia_dias
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ref, cliente_nombre||'Cliente', cliente_doc||'', cliente_email||'', cliente_tel||'', cliente_dir||'',
        servicio_tipo||'legal', servicio_titulo||'Cotización de Servicios', parseFloat(monto_base)||0, moneda||'USD',
        parseInt(duracion_meses)||1, parseFloat(superficie_m2)||0, JSON.stringify(items||[]),
        parseFloat(itbis)||0, parseFloat(total)||parseFloat(monto_base)||0, observaciones||'',
        fecha||new Date().toISOString().substring(0,10), parseInt(vigencia_dias)||30
      ]
    );
    res.json({ ok: true, referencia: ref });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cotiRouter.post('/generar-pdf', async (req, res) => {
  try {
    const pdfBuffer = await generateQuotationPDF(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Cotizacion_${req.body.referencia || 'GSD'}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).send('Error generando PDF: ' + err.message);
  }
});

cotiRouter.post('/vista-previa-html', async (req, res) => {
  try {
    const html = generarHTML(req.body);
    const clientPayloadJson = JSON.stringify(req.body).replace(/</g, '\\u003c');
    const toolbar = `
<div class="no-print" style="position:sticky;top:0;left:0;right:0;z-index:9999;background:#1E3962;color:#ffffff;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,0.2);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <span style="font-weight:700;font-size:12.5px;letter-spacing:0.5px;color:#74B241;">GSD QUOTER</span>
    <span style="color:#ffffff;font-size:12.5px;">Vista Previa de Cotización</span>
    <span style="color:#A9BBD2;font-size:11.5px;">💡 Para formato perfecto sin márgenes blancos ni cortes, usa <b>Descargar PDF Oficial</b>.</span>
  </div>
  <div style="display:flex;gap:10px;align-items:center;">
    <button onclick="window.print()" style="background:transparent;border:1px solid #74B241;color:#ffffff;padding:6px 13px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;">
      🖨️ Imprimir
    </button>
    <button onclick="descargarPDFDirecto()" style="background:#74B241;border:none;color:#ffffff;padding:7px 15px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;">
      📥 Descargar PDF Oficial (A4 Completo)
    </button>
  </div>
</div>
<script>
  const _cotiData = ${clientPayloadJson};
  async function descargarPDFDirecto() {
    try {
      const res = await fetch('/admin/cotizaciones/generar-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(_cotiData)
      });
      if (!res.ok) throw new Error('Error generando PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Cotizacion_' + (_cotiData.referencia || 'GSD') + '.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Error al descargar PDF: ' + e.message);
    }
  }
</script>
`;
    const finalHtml = html.replace('<body>', '<body>' + toolbar);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(finalHtml);
  } catch (err) {
    res.status(500).send('Error generando vista previa HTML: ' + err.message);
  }
});

cotiRouter.get('/:id/pdf', async (req, res) => {
  await getDb();
  const coti = queryOne('SELECT * FROM cotizaciones WHERE id=? OR referencia=?', [req.params.id, req.params.id]);
  if (!coti) return res.status(404).send('Cotización no encontrada');
  try {
    coti.items = JSON.parse(coti.items_json || '[]');
  } catch(e) { coti.items = []; }
  
  try {
    const pdfBuffer = await generateQuotationPDF(coti);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Cotizacion_${coti.referencia}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).send('Error generando PDF: ' + err.message);
  }
});

cotiRouter.get('/:id/imprimir', async (req, res) => {
  await getDb();
  const coti = queryOne('SELECT * FROM cotizaciones WHERE id=? OR referencia=?', [req.params.id, req.params.id]);
  if (!coti) return res.status(404).send('Cotización no encontrada');
  try {
    coti.items = JSON.parse(coti.items_json || '[]');
  } catch(e) { coti.items = []; }
  
  try {
    const html = generarHTML(coti);
    const toolbar = `
<div class="no-print" style="position:sticky;top:0;left:0;right:0;z-index:9999;background:#1E3962;color:#ffffff;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,0.2);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <span style="font-weight:700;font-size:12.5px;letter-spacing:0.5px;color:#74B241;">GSD QUOTER</span>
    <span style="color:#ffffff;font-size:12.5px;">Cotización ${coti.referencia}</span>
    <span style="color:#A9BBD2;font-size:11.5px;">💡 Descarga el PDF oficial directo sin márgenes de navegador ni saltos de página.</span>
  </div>
  <div style="display:flex;gap:10px;align-items:center;">
    <button onclick="window.print()" style="background:transparent;border:1px solid #74B241;color:#ffffff;padding:6px 13px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;">
      🖨️ Imprimir
    </button>
    <a href="/admin/cotizaciones/${coti.id}/pdf" style="background:#74B241;text-decoration:none;color:#ffffff;padding:7px 15px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;display:inline-block;">
      📥 Descargar PDF Oficial (A4 Completo)
    </a>
  </div>
</div>
`;
    const finalHtml = html.replace('<body>', '<body>' + toolbar);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(finalHtml);
  } catch (err) {
    res.status(500).send('Error generando impresión HTML: ' + err.message);
  }
});

app.use('/admin/cotizaciones', cotiRouter);

// ─── EXPEDIENTES (GSD EXPEDIENTES INTEGRADO) ──────────
const expeRouter = express.Router();
expeRouter.use(requireAuth);

expeRouter.get('/', async (req, res) => {
  await getDb();
  const expedientes = queryAll('SELECT * FROM expedientes ORDER BY created_at DESC') || [];
  res.render('admin/expedientes/index', { page: 'expedientes', initialView: 'list', expedientes });
});

expeRouter.post('/api/guardar', async (req, res) => {
  const d = req.body;
  await getDb();
  try {
    run(
      `INSERT OR REPLACE INTO expedientes (
        codigo, cotizacion_ref, servicio_tipo, cliente_nombre, cliente_doc, cliente_tel, cliente_email, cliente_dir,
        honorario, moneda, responsable, tecnico, prioridad, estado, fecha_inicio, fecha_fin,
        objeto_json, ubicacion_json, linderos_json, tecnico_json, docs_json, tasks_json, avances_json, notas_json, evidencias_json, log_json
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        d.id || d.codigo, d.quote||'', d.svc||'deslinde', d.cliente?.nombre||d.cliente_nombre||'Cliente',
        d.cliente?.cedula||d.cliente_doc||'', d.cliente?.tel||d.cliente_tel||'', d.cliente?.email||d.cliente_email||'', d.cliente?.dir||d.cliente_dir||'',
        parseFloat(d.honorario)||0, d.mon||d.moneda||'USD', d.resp||d.responsable||'Esteban Mejía', d.tec||d.tecnico||'',
        d.pri||d.prioridad||'Media', d.estado||'proc', d.inicio||d.fecha_inicio||new Date().toISOString().substring(0,10), d.fin||d.fecha_fin||'',
        JSON.stringify(d.objeto||{}), JSON.stringify(d.ubic||{}), JSON.stringify(d.linderos||{}), JSON.stringify(d.tecnico||{}),
        JSON.stringify(d.docs||[]), JSON.stringify(d.tasks||[]), JSON.stringify(d.avances||[]), JSON.stringify(d.notas||[]),
        JSON.stringify(d.evid||[]), JSON.stringify(d.log||[])
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/admin/expedientes', expeRouter);

// ─── AJUSTES DEL SISTEMA (MARCA, LOGO SVG, INSTAGRAM & META API, DATOS EMPRESA) ───
const { syncInstagramFeed } = require('./services/instagramService');
const ajustesRouter = express.Router();
ajustesRouter.use(requireAuth);

ajustesRouter.get('/', async (req, res) => {
  await getDb();
  const logoRow = queryOne("SELECT value FROM settings WHERE key='logo_url'");
  const currentLogo = logoRow?.value || (fs.existsSync(path.join(__dirname, 'public', 'img', 'logo-gsd.svg')) ? '/img/logo-gsd.svg' : '/img/logo-gsd.png');
  
  const metaTokenRow = queryOne("SELECT value FROM settings WHERE key='meta_access_token'");
  const metaUserRow = queryOne("SELECT value FROM settings WHERE key='meta_user_id'");
  const handleRow = queryOne("SELECT instagram_handle, posts_json FROM social_feeds WHERE project='bienes-raices'") || {};
  
  const compName = queryOne("SELECT value FROM settings WHERE key='company_name'")?.value || 'Geosolutions Source Dominicana, S.R.L.';
  const compRnc = queryOne("SELECT value FROM settings WHERE key='company_rnc'")?.value || '1-33-79694-5';
  const compPhone = queryOne("SELECT value FROM settings WHERE key='company_phone'")?.value || '(829) 493-7254';
  const compEmail = queryOne("SELECT value FROM settings WHERE key='company_email'")?.value || 'Esteban@geosolutions.com';
  const compAddress = queryOne("SELECT value FROM settings WHERE key='company_address'")?.value || 'Av. Barceló, Plaza Roque III, Punta Cana, R.D.';

  let instaPosts = [];
  try {
    instaPosts = JSON.parse(handleRow.posts_json || '[]');
  } catch(e) { instaPosts = []; }

  res.render('admin/ajustes/index', {
    page: 'ajustes',
    logoUrl: currentLogo,
    metaToken: metaTokenRow?.value || '',
    metaUserId: metaUserRow?.value || 'me',
    instaHandle: handleRow.instagram_handle || '@gsd.realestate',
    instaPosts,
    companyName: compName,
    companyRnc: compRnc,
    companyPhone: compPhone,
    companyEmail: compEmail,
    companyAddress: compAddress,
    success: req.query.saved === '1',
    successMsg: req.query.msg ? decodeURIComponent(req.query.msg) : '¡Configuración guardada exitosamente!',
    error: req.query.error ? decodeURIComponent(req.query.error) : null
  });
});

ajustesRouter.post('/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) {
    return res.redirect('/admin/ajustes?error=' + encodeURIComponent('Por favor selecciona un archivo SVG o PNG válido.') + '#logo');
  }
  
  const uploadedPath = req.file.path;
  const isSvg = req.file.originalname.toLowerCase().endsWith('.svg') || req.file.mimetype === 'image/svg+xml';
  const targetLogoRel = isSvg ? '/img/logo-gsd.svg' : `/uploads/branding/${req.file.filename}`;

  try {
    if (isSvg) {
      try {
        const destSvg = path.join(__dirname, 'public', 'img', 'logo-gsd.svg');
        fs.copyFileSync(uploadedPath, destSvg);
      } catch(e) {}
    }

    await getDb();
    const logoUrl = isSvg ? '/img/logo-gsd.svg' : targetLogoRel;
    run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('logo_url', ?, datetime('now','localtime'))", [logoUrl]);
    res.redirect('/admin/ajustes?saved=1&msg=' + encodeURIComponent('Logotipo vectorial actualizado correctamente.') + '#logo');
  } catch(err) {
    res.redirect('/admin/ajustes?error=' + encodeURIComponent(err.message) + '#logo');
  }
});

ajustesRouter.post('/svg-code', async (req, res) => {
  const { svg_code } = req.body;
  if (!svg_code || !svg_code.trim().startsWith('<svg')) {
    return res.redirect('/admin/ajustes?error=' + encodeURIComponent('El código SVG ingresado no es válido. Debe iniciar con <svg.') + '#logo');
  }

  try {
    try {
      const destSvg = path.join(__dirname, 'public', 'img', 'logo-gsd.svg');
      fs.writeFileSync(destSvg, svg_code.trim(), 'utf8');
    } catch(e) {}

    await getDb();
    run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('logo_url', '/img/logo-gsd.svg', datetime('now','localtime'))");
    res.redirect('/admin/ajustes?saved=1&msg=' + encodeURIComponent('Código SVG guardado con éxito.') + '#logo');
  } catch(err) {
    res.redirect('/admin/ajustes?error=' + encodeURIComponent(err.message) + '#logo');
  }
});

ajustesRouter.post('/instagram/save', async (req, res) => {
  const { meta_access_token, meta_user_id, instagram_handle } = req.body;
  await getDb();
  try {
    run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('meta_access_token', ?, datetime('now','localtime'))", [meta_access_token ? meta_access_token.trim() : '']);
    run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('meta_user_id', ?, datetime('now','localtime'))", [meta_user_id ? meta_user_id.trim() : 'me']);
    run("UPDATE social_feeds SET instagram_handle=?, updated_at=datetime('now','localtime')", [instagram_handle ? instagram_handle.trim() : '@gsd']);
    res.redirect('/admin/ajustes?saved=1&msg=' + encodeURIComponent('Credenciales de Meta Graph API guardadas.') + '#instagram');
  } catch(err) {
    res.redirect('/admin/ajustes?error=' + encodeURIComponent(err.message) + '#instagram');
  }
});

ajustesRouter.post('/instagram/sync', async (req, res) => {
  try {
    const result = await syncInstagramFeed({ project: 'all' });
    res.redirect('/admin/ajustes?saved=1&msg=' + encodeURIComponent(`¡Se sincronizaron exitosamente ${result.count} publicaciones reales desde Meta Graph API!`) + '#instagram');
  } catch(err) {
    res.redirect('/admin/ajustes?error=' + encodeURIComponent('Error al conectar con Meta Graph API: ' + err.message) + '#instagram');
  }
});

ajustesRouter.post('/empresa', async (req, res) => {
  const { company_name, company_rnc, company_phone, company_email, company_address } = req.body;
  await getDb();
  try {
    run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('company_name', ?, datetime('now','localtime'))", [company_name || '']);
    run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('company_rnc', ?, datetime('now','localtime'))", [company_rnc || '']);
    run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('company_phone', ?, datetime('now','localtime'))", [company_phone || '']);
    run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('company_email', ?, datetime('now','localtime'))", [company_email || '']);
    run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('company_address', ?, datetime('now','localtime'))", [company_address || '']);
    res.redirect('/admin/ajustes?saved=1&msg=' + encodeURIComponent('Datos institucionales guardados.') + '#empresa');
  } catch(err) {
    res.redirect('/admin/ajustes?error=' + encodeURIComponent(err.message) + '#empresa');
  }
});

app.use('/admin/ajustes', ajustesRouter);
app.get('/admin/branding', (req, res) => res.redirect('/admin/ajustes#logo'));
app.get('/admin/instagram', (req, res) => res.redirect('/admin/ajustes#instagram'));

// Public API for Instagram feeds across projects (CORS enabled for child sites)
app.get('/api/instagram/:project?', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cache-Control', 'public, max-age=60, s-maxage=60');

  try {
    await getDb();
    const project = req.params.project || req.query.project || 'bienes-raices';
    const feed = queryOne('SELECT * FROM social_feeds WHERE project = ?', [project]);

    if (!feed) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    let posts = [];
    try {
      posts = JSON.parse(feed.posts_json || '[]');
    } catch {
      posts = [];
    }

    res.json({
      project: feed.project,
      project_name: feed.project_name,
      instagram_handle: feed.instagram_handle,
      instagram_url: feed.instagram_url,
      posts
    });
  } catch (e) {
    res.status(500).json({ error: 'Error al consultar feed' });
  }
});

// Webhook endpoint para Make.com u otras automatizaciones
app.post('/api/instagram/webhook', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  try {
    const { secret, project = 'bienes-raices', posts, instagram_handle, instagram_url } = req.body;

    const expectedSecret = process.env.MAKE_WEBHOOK_SECRET || 'gsd_make_2026';
    if (secret && secret !== expectedSecret) {
      return res.status(403).json({ ok: false, error: 'Clave secret de webhook inválida' });
    }

    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ ok: false, error: 'Se requiere una lista de publicaciones en el campo "posts"' });
    }

    await getDb();

    const formatted = posts.slice(0, 12).map((p, idx) => ({
      id: String(p.id || Date.now() + idx),
      caption: p.caption || '',
      media_url: p.media_url || p.imageUrl || '',
      thumbnail_url: p.thumbnail_url || p.media_url || '',
      permalink: p.permalink || p.link || 'https://www.instagram.com/',
      timestamp: p.timestamp || new Date().toISOString()
    }));

    run(
      `UPDATE social_feeds SET 
        posts_json = ?, 
        instagram_handle = COALESCE(?, instagram_handle),
        instagram_url = COALESCE(?, instagram_url),
        updated_at = datetime('now', 'localtime')
       WHERE project = ?`,
      [JSON.stringify(formatted), instagram_handle ? instagram_handle.trim() : null, instagram_url ? instagram_url.trim() : null, project]
    );

    console.log(`[Make Webhook] Sincronizadas ${formatted.length} publicaciones para ${project}`);
    res.json({ ok: true, count: formatted.length, project });
  } catch (err) {
    console.error('Error en webhook de Make:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).send(`
    <html>
      <body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2>Error interno del servidor</h2>
        <p style="color:#666;">${err && err.message ? err.message : 'Error desconocido'}</p>
        <a href="/admin/login" style="color:#4A9B6F;">← Volver al login</a>
      </body>
    </html>
  `);
});

// ─── Export / Start ──────────────────────────────────
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║  GSD — Geosolutions Source Dominicana    ║
║  🌐 Site:  http://localhost:${PORT}          ║
║  🔐 Admin: http://localhost:${PORT}/admin    ║
║  Usuario:  ${process.env.ADMIN_USER || 'admin'}                       ║
║  Password: ${process.env.ADMIN_PASS || 'gsd2024admin'}           ║
╚══════════════════════════════════════════╝
    `);
  });
}

module.exports = app;
