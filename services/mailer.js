const nodemailer = require('nodemailer');

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (Number(process.env.SMTP_PORT) || 465) === 465,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `GSD Dominicana <${process.env.SMTP_USER}>` : 'GSD Dominicana <no-reply@gsd.com.do>'),
};

async function sendLeadAlert({
  agentEmail = process.env.AGENT_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'esteban@gsd.com.do',
  clientName,
  clientPhone,
  clientEmail,
  clientType = 'General',
  formSource = 'Web Corporativa',
  service = '',
  message = ''
}) {
  if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
    console.log('[CRM Mailer] SMTP no configurado en .env. Omitiendo envío de correo.');
    return { ok: false, reason: 'SMTP no configurado' };
  }

  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  const subject = `🔔 Nuevo Lead [${clientType}]: ${clientName} — ${formSource}`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
      .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
      .header { background: #1A3A52; padding: 22px 26px; color: #FFFFFF; }
      .header h2 { margin: 0; font-size: 19px; font-weight: 700; }
      .header p { margin: 4px 0 0; font-size: 12.5px; color: #94A3B8; }
      .badge { display: inline-block; background: ${clientType === 'Legal' ? '#2B6CB0' : clientType === 'Bienes Raíces' ? '#0D9488' : '#B7791F'}; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; margin-top: 8px; }
      .body { padding: 24px 26px; }
      .info-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .info-table td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
      .info-table td.label { font-weight: 600; color: #64748B; width: 35%; background: #F8FAFC; }
      .info-table td.value { font-weight: 600; color: #0F172A; }
      .msg-box { background: #F1F5F9; border-left: 4px solid #1A3A52; padding: 12px 14px; margin-top: 18px; border-radius: 0 6px 6px 0; }
      .msg-box h4 { margin: 0 0 4px; font-size: 11.5px; text-transform: uppercase; color: #475569; }
      .msg-box p { margin: 0; font-size: 13px; color: #1E293B; line-height: 1.4; white-space: pre-line; }
      .footer { background: #F8FAFC; padding: 14px 26px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11.5px; color: #94A3B8; }
      .btn-action { display: inline-block; background: #25D366; color: #FFFFFF; text-decoration: none; padding: 9px 16px; font-size: 12.5px; font-weight: 600; border-radius: 6px; margin-top: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Nuevo Cliente Registrado en CRM</h2>
        <p>Prospecto entrante clasificado y creado automáticamente</p>
        <span class="badge">${clientType}</span>
      </div>
      <div class="body">
        <table class="info-table">
          <tr>
            <td class="label">Nombre:</td>
            <td class="value">${clientName}</td>
          </tr>
          <tr>
            <td class="label">Teléfono:</td>
            <td class="value"><a href="tel:${clientPhone}" style="color:#0D9488;text-decoration:none;">${clientPhone}</a></td>
          </tr>
          <tr>
            <td class="label">Correo:</td>
            <td class="value">${clientEmail || '<span style="color:#94A3B8;">No especificado</span>'}</td>
          </tr>
          <tr>
            <td class="label">Tipo de Cliente:</td>
            <td class="value"><strong>${clientType}</strong></td>
          </tr>
          <tr>
            <td class="label">Servicio Solicitado:</td>
            <td class="value">${service || 'Consulta General'}</td>
          </tr>
          <tr>
            <td class="label">Origen:</td>
            <td class="value">${formSource}</td>
          </tr>
        </table>

        ${message ? `
        <div class="msg-box">
          <h4>Detalle o Mensaje:</h4>
          <p>${message}</p>
        </div>` : ''}

        <div style="text-align:center;margin-top:20px;">
          <a href="https://wa.me/${(clientPhone || '').replace(/[^0-9]/g, '')}" class="btn-action">
            💬 Contactar por WhatsApp
          </a>
        </div>
      </div>
      <div class="footer">
        Geosolutions Source Dominicana (GSD) — Sistema Integral CRM & Notificaciones Hostinger
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const res = await transporter.sendMail({
      from: SMTP_CONFIG.from,
      to: agentEmail,
      subject,
      html
    });
    return { ok: true, messageId: res.messageId };
  } catch (err) {
    console.error('[CRM Mailer] Error enviando correo:', err);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendLeadAlert, SMTP_CONFIG };
