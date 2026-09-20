const nodemailer = require('nodemailer');

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (Number(process.env.SMTP_PORT) || 465) === 465,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `GSD Dominicana <${process.env.SMTP_USER}>` : 'GSD Dominicana <info@geosolutionssource.com>'),
};

function buildUnifiedTemplate({ headerTitle, headerSubtitle, badgeText, badgeColor = '#1A3A52', bodyHtml, actionUrl = '', actionText = '' }) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        margin: 0;
        padding: 24px 12px;
        background-color: #F8FAFC;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #1E293B;
      }
      .email-card {
        max-width: 600px;
        margin: 0 auto;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      }
      .brand-header {
        text-align: center;
        padding: 30px 24px 20px;
        background: #FFFFFF;
        border-bottom: 1px solid #F1F5F9;
      }
      .brand-title {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0.8px;
        color: #1A3A52;
        margin: 0;
        text-transform: uppercase;
      }
      .brand-sub {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 1.8px;
        color: #64748B;
        margin: 4px 0 0;
        text-transform: uppercase;
      }
      .notice-strip {
        background: #FAFBFD;
        padding: 18px 26px;
        border-bottom: 1px solid #F1F5F9;
      }
      .notice-title {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        color: #1A3A52;
      }
      .notice-sub {
        margin: 3px 0 0;
        font-size: 12.5px;
        color: #64748B;
      }
      .badge {
        display: inline-block;
        background: ${badgeColor};
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 3px 9px;
        border-radius: 4px;
        margin-top: 8px;
      }
      .card-body {
        padding: 26px;
        font-size: 13.5px;
        line-height: 1.6;
        color: #334155;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0;
      }
      .info-table td {
        padding: 9px 12px;
        font-size: 13px;
        border-bottom: 1px solid #F1F5F9;
      }
      .info-table td.label {
        font-weight: 600;
        color: #64748B;
        width: 36%;
        background: #F8FAFC;
      }
      .info-table td.value {
        font-weight: 600;
        color: #0F172A;
      }
      .box-msg {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-left: 4px solid #1A3A52;
        border-radius: 6px;
        padding: 12px 15px;
        margin-top: 16px;
      }
      .box-msg h4 {
        margin: 0 0 5px;
        font-size: 12px;
        color: #1A3A52;
        text-transform: uppercase;
      }
      .box-msg p {
        margin: 0;
        font-size: 13px;
        color: #475569;
        line-height: 1.5;
        white-space: pre-line;
      }
      .btn-wrap {
        text-align: center;
        margin-top: 22px;
        padding-top: 18px;
        border-top: 1px solid #F1F5F9;
      }
      .action-btn {
        display: inline-block;
        background: #1A3A52;
        color: #FFFFFF !important;
        text-decoration: none;
        padding: 10px 22px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 6px;
      }
      .card-footer {
        background: #F8FAFC;
        text-align: center;
        padding: 18px 24px;
        border-top: 1px solid #E2E8F0;
        font-size: 11px;
        color: #94A3B8;
      }
      .card-footer a {
        color: #64748B;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="email-card">
      <div class="brand-header">
        <h1 class="brand-title">GEOSOLUTIONS SOURCE DOMINICANA</h1>
        <p class="brand-sub">GSD Real Estate & Legal</p>
      </div>

      <div class="notice-strip">
        <h2 class="notice-title">${headerTitle}</h2>
        <p class="notice-sub">${headerSubtitle}</p>
        ${badgeText ? `<span class="badge">${badgeText}</span>` : ''}
      </div>

      <div class="card-body">
        ${bodyHtml}
        ${actionUrl ? `
        <div class="btn-wrap">
          <a href="${actionUrl}" class="action-btn">${actionText}</a>
        </div>
        ` : ''}
      </div>

      <div class="card-footer">
        Geosolutions Source Dominicana, S.R.L. · Punta Cana & Santo Domingo, RD<br/>
        Portal Oficial: <a href="https://geosolutionssource.com">geosolutionssource.com</a>
      </div>
    </div>
  </body>
  </html>
  `;
}

async function sendLeadAlert({
  agentEmail = process.env.AGENT_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'esteban@geosolutionssource.com',
  clientName,
  clientPhone,
  clientEmail,
  clientType = 'General',
  formSource = 'Web Corporativa',
  service = '',
  message = ''
}) {
  if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
    console.log('[CRM Mailer] SMTP no configurado en .env.');
    return { ok: false, reason: 'SMTP no configurado' };
  }

  const transporter = nodemailer.createTransport(SMTP_CONFIG);
  const subject = `[${clientType}] Nuevo Registro: ${clientName} — ${formSource}`;

  const bodyHtml = `
    <table class="info-table">
      <tr>
        <td class="label">Nombre:</td>
        <td class="value">${clientName}</td>
      </tr>
      <tr>
        <td class="label">Teléfono:</td>
        <td class="value"><a href="tel:${clientPhone}" style="color:#1A3A52;text-decoration:none;">${clientPhone}</a></td>
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
    <div class="box-msg">
      <h4>Detalle de la Solicitud:</h4>
      <p>${message}</p>
    </div>` : ''}
  `;

  const html = buildUnifiedTemplate({
    headerTitle: 'Nuevo Cliente Registrado en CRM',
    headerSubtitle: `Prospecto clasificado como ${clientType} desde ${formSource}`,
    badgeText: clientType,
    badgeColor: clientType === 'Legal' ? '#2B6CB0' : '#1A3A52',
    bodyHtml,
    actionUrl: `https://wa.me/${(clientPhone || '').replace(/[^0-9]/g, '')}`,
    actionText: 'Responder por WhatsApp'
  });

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

module.exports = { sendLeadAlert, SMTP_CONFIG, buildUnifiedTemplate };
