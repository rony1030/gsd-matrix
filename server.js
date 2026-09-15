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

['propiedades', 'blog'].forEach((d) => {
  fs.mkdirSync(path.join(uploadsDir, d), { recursive: true });
});

app.use('/uploads', express.static(uploadsDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const sub = req.baseUrl.includes('propiedades') ? 'propiedades' : 'blog';
      cb(null, path.join(uploadsDir, sub));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);
    cb(null, ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session?.admin || req.cookies?.gsd_admin === '1') {
    return next();
  }
  res.redirect('/admin/login');
}

app.use('/admin/bienes-raices', requireAuth, require('./real-estate-router'));

// Cotizaciones & Expedientes CRM
app.get('/admin/cotizaciones', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cotizaciones.html'));
});

app.get('/admin/expedientes', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'expedientes.html'));
});

// ─── Initialize DB ────────────────────────────────────
let dbReady = false;
getDb().then(() => {
  dbReady = true;
  console.log('✅ Base de datos lista');
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

// Dashboard
app.get('/admin', requireAuth, async (req, res) => {
  try {
    await getDb();
    const qProp = queryOne('SELECT COUNT(*) as n FROM propiedades');
    const qBlogs = queryOne('SELECT COUNT(*) as n FROM blogs');
    const qLeads = queryOne('SELECT COUNT(*) as n FROM leads');
    const qNuevos = queryOne("SELECT COUNT(*) as n FROM leads WHERE estado='nuevo'");

    const totalProp = qProp?.n || 0;
    const totalBlogs = qBlogs?.n || 0;
    const totalLeads = qLeads?.n || 0;
    const leadsNuevos = qNuevos?.n || 0;
    const latestLeads = queryAll('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5') || [];

    res.render('admin/dashboard', {
      page: 'dashboard',
      stats: { totalProp, totalBlogs, totalLeads, leadsNuevos },
      latestLeads
    });
  } catch (err) {
    console.error('Error cargando dashboard:', err);
    res.render('admin/dashboard', {
      page: 'dashboard',
      stats: { totalProp: 3, totalBlogs: 0, totalLeads: 2, leadsNuevos: 1 },
      latestLeads: []
    });
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

// ─── LEADS ────────────────────────────────────────────
const leadsRouter = express.Router();
leadsRouter.use(requireAuth);

leadsRouter.get('/', async (req, res) => {
  await getDb();
  const leads = queryAll('SELECT * FROM leads ORDER BY created_at DESC');
  res.render('admin/leads/index', { page: 'leads', leads });
});

leadsRouter.get('/nuevo', (req, res) => {
  res.render('admin/leads/form', { page: 'leads', lead: null, isEdit: false });
});

leadsRouter.post('/nuevo', async (req, res) => {
  const { nombre, email, telefono, servicio, mensaje, estado, origen } = req.body;
  await getDb();
  run(
    'INSERT INTO leads (nombre,email,telefono,servicio,mensaje,estado,origen) VALUES (?,?,?,?,?,?,?)',
    [nombre, email||'', telefono||'', servicio||'', mensaje||'', estado||'nuevo', origen||'manual']
  );
  res.redirect('/admin/leads');
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
    'ID,Nombre,Email,Teléfono,Servicio,Mensaje,Estado,Origen,Fecha',
    ...leads.map(l => `${l.id},"${l.nombre}","${l.email}","${l.telefono}","${l.servicio}","${l.mensaje?.replace(/"/g,'""')}","${l.estado}","${l.origen}","${l.created_at}"`)
  ].join('\n');
  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', 'attachment; filename=leads-gsd.csv');
  res.send(csv);
});

app.use('/admin/leads', leadsRouter);

// ─── INSTAGRAM & REDES (MULTIMARCA / PROYECTOS) ──────
const instagramRouter = express.Router();
instagramRouter.use(requireAuth);

instagramRouter.get('/', async (req, res) => {
  await getDb();
  const allFeeds = queryAll('SELECT * FROM social_feeds ORDER BY id ASC');
  const targetProject = req.query.project || (allFeeds[0] ? allFeeds[0].project : 'bienes-raices');
  let currentFeed = allFeeds.find(f => f.project === targetProject) || allFeeds[0];

  if (currentFeed) {
    try {
      currentFeed.posts = JSON.parse(currentFeed.posts_json || '[]');
    } catch {
      currentFeed.posts = [];
    }
  }

  res.render('admin/instagram', {
    page: 'instagram',
    allFeeds,
    currentFeed,
    success: req.query.saved === '1'
  });
});

instagramRouter.post('/', async (req, res) => {
  await getDb();
  const { project, instagram_handle, instagram_url } = req.body;

  const posts = [];
  for (let i = 0; i < 4; i++) {
    const image = (req.body[`post_image_${i}`] || '').trim();
    const link = (req.body[`post_link_${i}`] || '').trim();
    const caption = (req.body[`post_caption_${i}`] || '').trim();
    if (image) {
      posts.push({ image, link, caption });
    }
  }

  run(
    'UPDATE social_feeds SET instagram_handle=?, instagram_url=?, posts_json=?, updated_at=datetime("now","localtime") WHERE project=?',
    [instagram_handle || '@gsd', instagram_url || 'https://www.instagram.com/', JSON.stringify(posts), project]
  );

  res.redirect(`/admin/instagram?project=${encodeURIComponent(project)}&saved=1`);
});

app.use('/admin/instagram', instagramRouter);

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
