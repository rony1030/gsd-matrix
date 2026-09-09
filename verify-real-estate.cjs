process.env.NODE_ENV='production';
process.env.VERCEL='1';
const assert=require('node:assert/strict');
const app=require('./server');
const server=app.listen(0,async()=>{
  const base=`http://localhost:${server.address().port}`;
  try{
    const anon=await fetch(base+'/admin/bienes-raices',{redirect:'manual'});assert.equal(anon.status,302);
    const login=await fetch(base+'/admin/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({usuario:process.env.ADMIN_USER,password:process.env.ADMIN_PASS}),redirect:'manual'});
    const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
    const response=await fetch(base+'/admin/bienes-raices',{headers:{cookie}});assert.equal(response.status,200);
    const html=await response.text();assert.ok(html.includes('Villa Las Palmas'));
    const csrf=await fetch(base+'/admin/bienes-raices/lead',{method:'POST',headers:{cookie,'Content-Type':'application/x-www-form-urlencoded'},body:'id=invalid&status=contactado'});assert.equal(csrf.status,403);
    const form=await fetch(base+'/admin/bienes-raices/propiedad?slug=villa-las-palmas',{headers:{cookie}});assert.equal(form.status,200);
    console.log('PASS: CRM central autenticado, seis propiedades accesibles, formulario de edición y protección CSRF.');
  }catch(error){console.error(error.message);process.exitCode=1;}finally{server.close();}
});
