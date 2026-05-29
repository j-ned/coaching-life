import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env['SMTP_HOST']!,
  port: Number(process.env['SMTP_PORT'] ?? 587),
  secure: process.env['SMTP_SECURE'] === 'true',
  auth: {
    user: process.env['SMTP_USER']!,
    pass: process.env['SMTP_PASS']!,
  },
});

const FROM = process.env['SMTP_FROM'] ?? process.env['SMTP_USER']!;
const ADMIN_EMAIL = process.env['ADMIN_EMAIL']!;

type MailOptions = {
  to: string;
  subject: string;
  html: string;
};

async function send(opts: MailOptions): Promise<void> {
  await transporter.sendMail({ from: FROM, ...opts });
}

// Échappe les données utilisateur avant injection dans le corps HTML de l'email
// (anti-injection HTML : nom, email, sujet, contenu sont saisis librement par le visiteur).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Templates ─────────────────────────────────────────────────────────────

export async function sendAppointmentConfirmation(data: {
  clientName: string;
  clientEmail: string;
  coachingType: string;
  date: string;
  time: string;
  duration: number;
}): Promise<void> {
  await send({
    to: data.clientEmail,
    subject: '✅ Confirmation de votre rendez-vous',
    html: `
      <h2>Bonjour ${escapeHtml(data.clientName)},</h2>
      <p>Votre rendez-vous a bien été enregistré.</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:8px"><strong>Type</strong></td><td style="padding:8px">${escapeHtml(data.coachingType)}</td></tr>
        <tr><td style="padding:8px"><strong>Date</strong></td><td style="padding:8px">${escapeHtml(data.date)}</td></tr>
        <tr><td style="padding:8px"><strong>Heure</strong></td><td style="padding:8px">${escapeHtml(data.time)}</td></tr>
        <tr><td style="padding:8px"><strong>Durée</strong></td><td style="padding:8px">${data.duration} min</td></tr>
      </table>
      <p>À bientôt !</p>
    `,
  });
}

export async function notifyAdminNewAppointment(data: {
  clientName: string;
  clientEmail: string;
  coachingType: string;
  date: string;
  time: string;
}): Promise<void> {
  await send({
    to: ADMIN_EMAIL,
    subject: `📅 Nouveau RDV — ${data.clientName}`,
    html: `
      <h3>Nouveau rendez-vous</h3>
      <table style="border-collapse:collapse">
        <tr><td style="padding:8px"><strong>Client</strong></td><td style="padding:8px">${escapeHtml(data.clientName)} (${escapeHtml(data.clientEmail)})</td></tr>
        <tr><td style="padding:8px"><strong>Type</strong></td><td style="padding:8px">${escapeHtml(data.coachingType)}</td></tr>
        <tr><td style="padding:8px"><strong>Date</strong></td><td style="padding:8px">${escapeHtml(data.date)} à ${escapeHtml(data.time)}</td></tr>
      </table>
    `,
  });
}

export async function notifyAdminNewMessage(data: {
  senderName: string;
  senderEmail: string;
  subject: string;
  content: string;
}): Promise<void> {
  await send({
    to: ADMIN_EMAIL,
    subject: `✉️ Nouveau message — ${data.senderName}`,
    html: `
      <h3>Nouveau message de contact</h3>
      <p><strong>De :</strong> ${escapeHtml(data.senderName)} &lt;${escapeHtml(data.senderEmail)}&gt;</p>
      <p><strong>Sujet :</strong> ${escapeHtml(data.subject)}</p>
      <hr/>
      <p>${escapeHtml(data.content).replace(/\n/g, '<br/>')}</p>
    `,
  });
}
