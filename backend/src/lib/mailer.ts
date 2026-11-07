import nodemailer from 'nodemailer';
import { isProductionEnv, readEnv, requireEnv, type EnvSource } from './env.js';

export type MailTemplate =
  'appointment-confirmation' | 'admin-new-appointment' | 'admin-new-message';

export type MailRecipient =
  { readonly kind: 'admin' } | { readonly kind: 'address'; readonly address: string };

export type OutgoingMail = {
  readonly template: MailTemplate;
  readonly to: MailRecipient;
  readonly subject: string;
  readonly html: string;
};

export type Mailer = {
  readonly kind: 'smtp' | 'log';
  readonly send: (mail: OutgoingMail) => Promise<void>;
};

type LogLine = (line: string) => void;

// Hors production, sans SMTP : aucun envoi réel. Seul le gabarit est journalisé — jamais le
// destinataire, le sujet ni le corps, qui peuvent porter des données personnelles, codes ou liens.
function createLogMailer(log: LogLine): Mailer {
  return {
    kind: 'log',
    send: async (mail) => {
      log(`[mail:log] envoi simulé (aucun SMTP configuré) : ${mail.template} → ${mail.to.kind}`);
    },
  };
}

function readSmtpPort(env: EnvSource): number {
  const raw = readEnv('SMTP_PORT', env) ?? '587';
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`SMTP_PORT invalide : ${raw}`);
  return port;
}

function createSmtpMailer(env: EnvSource): Mailer {
  const host = requireEnv('SMTP_HOST', env);
  const user = requireEnv('SMTP_USER', env);
  const transporter = nodemailer.createTransport({
    host,
    port: readSmtpPort(env),
    secure: readEnv('SMTP_SECURE', env) === 'true',
    auth: { user, pass: requireEnv('SMTP_PASS', env) },
  });
  const from = readEnv('SMTP_FROM', env) ?? user;
  const adminEmail = requireEnv('ADMIN_EMAIL', env);

  return {
    kind: 'smtp',
    send: async ({ to, subject, html }) => {
      const address = to.kind === 'admin' ? adminEmail : to.address;
      await transporter.sendMail({ from, to: address, subject, html });
    },
  };
}

export function createMailer(env: EnvSource, log: LogLine = console.info): Mailer {
  if (readEnv('SMTP_HOST', env) === undefined && !isProductionEnv(env)) {
    return createLogMailer(log);
  }
  return createSmtpMailer(env);
}

let _mailer: Mailer | null = null;
function getMailer(): Mailer {
  return (_mailer ??= createMailer(process.env));
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

// Templates

export async function sendAppointmentConfirmation(data: {
  clientName: string;
  clientEmail: string;
  coachingType: string;
  date: string;
  time: string;
  duration: number;
}): Promise<void> {
  await getMailer().send({
    template: 'appointment-confirmation',
    to: { kind: 'address', address: data.clientEmail },
    subject: 'Confirmation de votre rendez-vous',
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
  await getMailer().send({
    template: 'admin-new-appointment',
    to: { kind: 'admin' },
    subject: `Nouveau RDV - ${data.clientName}`,
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
  await getMailer().send({
    template: 'admin-new-message',
    to: { kind: 'admin' },
    subject: `Nouveau message - ${data.senderName}`,
    html: `
      <h3>Nouveau message de contact</h3>
      <p><strong>De :</strong> ${escapeHtml(data.senderName)} &lt;${escapeHtml(data.senderEmail)}&gt;</p>
      <p><strong>Sujet :</strong> ${escapeHtml(data.subject)}</p>
      <hr/>
      <p>${escapeHtml(data.content).replace(/\n/g, '<br/>')}</p>
    `,
  });
}
