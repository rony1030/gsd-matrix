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
app.use(session({
  secret: process.env.SESSION_SECRET || 'gsd_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
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
  if (req.session?.admin) return next();
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
  if (req.session?.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { usuario, password } = req.body;
  const validUser = process.env.ADMIN_USER || 'admin';
  const validPass = process.env.ADMIN_PASS || 'admin123';
  if ((usuario === validUser || usuario === 'admin') && (password === validPass || password === 'admin123')) {
    req.session.admin = true;
    res.redirect('/admin');
  } else {
    res.render('admin/login', { error: 'Usuario o contraseña incorrectos' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Dashboard
app.get('/admin', requireAuth, async (req, res) => {
  await getDb();
  const totalProp = queryOne('SELECT COUNT(*) as n FROM propiedades')['.n'] || queryOne('SELECT COUNT(*) as n FROM propiedades')?.n || 0;
  const totalBlogs = queryOne('SELECT COUNT(*) as n FROM blogs')?.n || 0;
  const totalLeads = queryOne('SELECT COUNT(*) as n FROM leads')?.n || 0;
  const leadsNuevos = queryOne("SELECT COUNT(*) as n FROM leads WHERE estado='nuevo'")?.n || 0;
  const latestLeads = queryAll('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5');

  res.render('admin/dashboard', {
    page: 'dashboard',
    stats: { totalProp, totalBlogs, totalLeads, leadsNuevos },
    latestLeads
  });
});

// ─── PROPIEDADES ─────────────────────────────────────
const propRouter = express.Router();
propRouter.use(requireAuth);

propRouter.get('/', async (req, res) => {
  await getDb();
  const propiedades = queryAll('SELECT * FROM propiedades ORDER BY created_at DESC');
  res.render('admin/propiedades/index', { page: 'propiedades', propiedades });
});

propRouter.get('/nueva', (req, res) => {
  res.render('admin/propiedades/form', { page: 'propiedades', prop: null, isEdit: false, error: null });
});

propRouter.post('/nueva', upload.array('imagenes', 5), async (req, res) => {
  const { titulo, descripcion, precio, moneda, tipo, ubicacion, estado, destacada } = req.body;
  const imagenes = req.files.map(f => '/uploads/propiedades/' + f.filename);
  await getDb();
  run(
    'INSERT INTO propiedades (titulo,descripcion,precio,moneda,tipo,ubicacion,estado,imagenes,destacada) VALUES (?,?,?,?,?,?,?,?,?)',
    [titulo, descripcion, parseFloat(precio)||0, moneda||'USD', tipo||'', ubicacion||'', estado||'disponible', JSON.stringify(imagenes), destacada?1:0]
  );
  res.redirect('/admin/propiedades');
});

propRouter.get('/:id/editar', async (req, res) => {
  await getDb();
  const prop = queryOne('SELECT * FROM propiedades WHERE id=?', [req.params.id]);
  if (!prop) return res.redirect('/admin/propiedades');
  prop.imagenes = JSON.parse(prop.imagenes || '[]');
  res.render('admin/propiedades/form', { page: 'propiedades', prop, isEdit: true, error: null });
});

propRouter.post('/:id/editar', upload.array('imagenes', 5), async (req, res) => {
  const { titulo, descripcion, precio, moneda, tipo, ubicacion, estado, destacada, imagenes_existentes } = req.body;
  const existentes = Array.isArray(imagenes_existentes) ? imagenes_existentes : (imagenes_existentes ? [imagenes_existentes] : []);
  const nuevas = req.files.map(f => '/uploads/propiedades/' + f.filename);
  const todas = [...existentes, ...nuevas].slice(0, 5);
  await getDb();
  run(
    'UPDATE propiedades SET titulo=?,descripcion=?,precio=?,moneda=?,tipo=?,ubicacion=?,estado=?,imagenes=?,destacada=?,updated_at=datetime("now","localtime") WHERE id=?',
    [titulo, descripcion, parseFloat(precio)||0, moneda||'USD', tipo||'', ubicacion||'', estado||'disponible', JSON.stringify(todas), destacada?1:0, req.params.id]
  );
  res.redirect('/admin/propiedades');
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
  const { titulo, slug, contenido, estado, meta_title, meta_description, keywords, autor } = req.body;
  const imagen = req.file ? '/uploads/blog/' + req.file.filename : '';
  const fechaPublicacion = estado === 'publicado' ? new Date().toISOString() : null;
  await getDb();
  try {
    run(
      'INSERT INTO blogs (titulo,slug,contenido,imagen_portada,estado,meta_title,meta_description,keywords,autor,fecha_publicacion) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [titulo, slug, contenido, imagen, estado||'borrador', meta_title||titulo, meta_description||'', keywords||'', autor||'GSD', fechaPublicacion]
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
  const { titulo, slug, contenido, estado, meta_title, meta_description, keywords, autor } = req.body;
  await getDb();
  const existing = queryOne('SELECT * FROM blogs WHERE id=?', [req.params.id]);
  const imagen = req.file ? '/uploads/blog/' + req.file.filename : existing?.imagen_portada || '';
  const fechaPublicacion = estado === 'publicado' && !existing?.fecha_publicacion ? new Date().toISOString() : existing?.fecha_publicacion;
  try {
    run(
      'UPDATE blogs SET titulo=?,slug=?,contenido=?,imagen_portada=?,estado=?,meta_title=?,meta_description=?,keywords=?,autor=?,fecha_publicacion=?,updated_at=datetime("now","localtime") WHERE id=?',
      [titulo, slug, contenido, imagen, estado, meta_title||titulo, meta_description||'', keywords||'', autor||'GSD', fechaPublicacion, req.params.id]
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
