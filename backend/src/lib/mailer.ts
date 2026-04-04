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
      <h2>Bonjour ${data.clientName},</h2>
      <p>Votre rendez-vous a bien été enregistré.</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:8px"><strong>Type</strong></td><td style="padding:8px">${data.coachingType}</td></tr>
        <tr><td style="padding:8px"><strong>Date</strong></td><td style="padding:8px">${data.date}</td></tr>
        <tr><td style="padding:8px"><strong>Heure</strong></td><td style="padding:8px">${data.time}</td></tr>
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
        <tr><td style="padding:8px"><strong>Client</strong></td><td style="padding:8px">${data.clientName} (${data.clientEmail})</td></tr>
        <tr><td style="padding:8px"><strong>Type</strong></td><td style="padding:8px">${data.coachingType}</td></tr>
        <tr><td style="padding:8px"><strong>Date</strong></td><td style="padding:8px">${data.date} à ${data.time}</td></tr>
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
      <p><strong>De :</strong> ${data.senderName} &lt;${data.senderEmail}&gt;</p>
      <p><strong>Sujet :</strong> ${data.subject}</p>
      <hr/>
      <p>${data.content.replace(/\n/g, '<br/>')}</p>
    `,
  });
}
