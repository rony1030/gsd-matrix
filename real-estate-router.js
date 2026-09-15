const express = require('express');
const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '.env.real-estate') });
const router = express.Router();

const DEFAULT_RE_URL = 'https://gsd-bienes-raices.vercel.app';
const DEFAULT_RE_KEY = '27d618d76e1215aa9107f0d39fb57801c18976ea02c907966d0dc048e655c718';

async function callApi(query = '', options = {}) {
  const base = process.env.REAL_ESTATE_URL || DEFAULT_RE_URL;
  const key = process.env.REAL_ESTATE_API_KEY || DEFAULT_RE_KEY;
  if (!base || !key) throw new Error('Configura la conexión con Bienes Raíces.');
  const response = await fetch(`${base.replace(/\/$/, '')}/api/crm${query}`, {
    ...options, signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('No se pudo completar la operación con Bienes Raíces.');
  return response.json();
}
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  req.session.realEstateCsrf ||= crypto.randomBytes(24).toString('hex');
  res.locals.csrf = req.session.realEstateCsrf;
  if (req.method === 'POST' && req.body.csrf !== req.session.realEstateCsrf) return res.status(403).send('Solicitud no autorizada.');
  next();
});
router.get('/', async (req, res) => {
  const pageNumber = Math.max(0, Math.floor(Number(req.query.p) || 0));
  try {
    const [properties, leads] = await Promise.all([callApi(`?resource=properties&page=${pageNumber}`), callApi(`?page=${pageNumber}`)]);
    res.render('admin/bienes-raices/index', { page:'bienes-raices', properties, leads, pageNumber, error:null });
  } catch {
    res.render('admin/bienes-raices/index', { page:'bienes-raices', properties:[], leads:[], pageNumber, error:'El módulo inmobiliario sincronizado está disponible en modo de lectura o puedes usar el editor de Propiedades del CRM.' });
  }
});
router.get('/propiedad', async (req, res) => {
  try {
    const properties = req.query.slug ? await callApi(`?resource=properties&page=${Math.max(0,Math.floor(Number(req.query.p)||0))}`) : [];
    const property = properties.find(p => p.slug === req.query.slug) || null;
    if (req.query.slug && !property) return res.status(404).send('Propiedad no encontrada.');
    res.render('admin/bienes-raices/form', {page:'bienes-raices', property, error:null});
  } catch {res.status(503).send('No se pudo cargar la propiedad. Vuelve al CRM e inténtalo de nuevo.');}
});
router.post('/propiedad', async (req,res) => {
  const b=req.body;
  const property={slug:b.slug,title:b.title,location:b.location,type:b.type,operation:b.operation,price:Number(b.price),currency:b.currency,beds:Number(b.beds),baths:Number(b.baths),area:Number(b.area),description:b.description,images:String(b.images||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),amenities:String(b.amenities||'').split(',').map(s=>s.trim()).filter(Boolean),featured:b.featured==='on',status:b.status};
  try {await callApi('',{method:'POST',body:JSON.stringify(property)});res.redirect('/admin/bienes-raices');}
  catch {res.status(400).render('admin/bienes-raices/form',{page:'bienes-raices',property,error:'No se pudo guardar. Revisa los campos y la conexión; las imágenes deben ser URLs HTTPS o rutas /images/ del demo.'});}
});
router.post('/lead', async (req,res) => {
  try {await callApi('',{method:'PATCH',body:JSON.stringify({id:req.body.id,status:req.body.status})});res.redirect('/admin/bienes-raices');}
  catch {res.status(503).send('No se pudo actualizar el contacto. Vuelve al CRM e inténtalo de nuevo.');}
});
module.exports=router;
