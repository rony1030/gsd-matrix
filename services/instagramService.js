// services/instagramService.js — Integración oficial con Meta Graph API / Instagram Graph API
const { getDb, queryOne, run } = require('../db');

async function syncInstagramFeed(options = {}) {
  await getDb();
  
  // 1. Obtener credenciales de settings o variables de entorno
  const tokenSetting = queryOne("SELECT value FROM settings WHERE key='meta_access_token'");
  const userIdSetting = queryOne("SELECT value FROM settings WHERE key='meta_user_id'");
  
  const token = options.token || tokenSetting?.value || process.env.META_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = options.userId || userIdSetting?.value || process.env.META_USER_ID || process.env.INSTAGRAM_USER_ID || 'me';
  
  if (!token || !token.trim()) {
    throw new Error('Debes configurar el Token de Acceso de Meta Graph API en Ajustes para sincronizar las publicaciones.');
  }

  // 2. Consultar Meta / Instagram Graph API
  let url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=12&access_token=${encodeURIComponent(token.trim())}`;
  
  if (userId && userId !== 'me' && !isNaN(Number(userId))) {
    url = `https://graph.facebook.com/v19.0/${encodeURIComponent(userId)}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=12&access_token=${encodeURIComponent(token.trim())}`;
  }

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(12000)
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Meta API Error (${data.error.code || 'Graph'}): ${data.error.message || JSON.stringify(data.error)}`);
  }

  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('La respuesta de Meta Graph API no contiene publicaciones válidas.');
  }

  // 3. Normalizar publicaciones
  const posts = data.data.map(item => {
    const imageUrl = item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : item.media_url;
    return {
      id: item.id,
      image: imageUrl,
      link: item.permalink || 'https://www.instagram.com/',
      caption: (item.caption || '').substring(0, 200),
      timestamp: item.timestamp || new Date().toISOString()
    };
  });

  // 4. Guardar en la base de datos
  const targetProject = options.project || 'bienes-raices';
  run(
    'UPDATE social_feeds SET posts_json=?, updated_at=datetime("now","localtime") WHERE project=?',
    [JSON.stringify(posts), targetProject]
  );
  
  run(
    'UPDATE social_feeds SET posts_json=?, updated_at=datetime("now","localtime") WHERE project="matriz"',
    [JSON.stringify(posts)]
  );

  return { ok: true, count: posts.length, posts };
}

module.exports = { syncInstagramFeed };
