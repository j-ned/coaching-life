import { MissingEnvError, isProductionEnv, readEnv, requireEnv, type EnvSource } from './env.js';

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
  readonly kind: MailTransportConfig['kind'];
  readonly send: (mail: OutgoingMail) => Promise<void>;
};

type LogLine = (line: string) => void;

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 10_000;
const DEFAULT_FROM_NAME = 'Coaching Life';

export type MailTransportConfig =
  | { readonly kind: 'resend'; readonly apiKey: string; readonly from: string }
  | { readonly kind: 'log' };

// L'API Resend dès que sa clé est posée, sinon le journal hors production. En production, l'absence
// de Resend est une erreur : les mails seraient perdus en silence.
export function readMailTransportConfig(env: EnvSource): MailTransportConfig {
  const apiKey = readEnv('RESEND_API_KEY', env);
  if (apiKey !== undefined) {
    const address = requireEnv('MAIL_FROM', env);
    const name = readEnv('MAIL_FROM_NAME', env) ?? DEFAULT_FROM_NAME;
    return { kind: 'resend', apiKey, from: `${name} <${address}>` };
  }

  if (isProductionEnv(env)) throw new MissingEnvError(['RESEND_API_KEY', 'MAIL_FROM']);
  return { kind: 'log' };
}

// Hors production, sans transport : aucun envoi réel. Seul le gabarit est journalisé — jamais le
// destinataire, le sujet ni le corps, qui peuvent porter des données personnelles, codes ou liens.
function createLogMailer(log: LogLine): Mailer {
  return {
    kind: 'log',
    send: async (mail) => {
      log(`[mail:log] envoi simulé (aucun transport configuré) : ${mail.template} → ${mail.to.kind}`);
    },
  };
}

// API HTTP de Resend. Un refus ou une panne rejette la promesse : l'appelant journalise.
// Le message garde le statut, jamais le destinataire ni la réponse de Resend, qui peut le citer.
function createResendMailer(
  config: Extract<MailTransportConfig, { kind: 'resend' }>,
  adminEmail: string,
  fetchFn: typeof fetch,
): Mailer {
  return {
    kind: 'resend',
    send: async ({ to, subject, html }) => {
      const address = to.kind === 'admin' ? adminEmail : to.address;
      let response: Response;
      try {
        response = await fetchFn(RESEND_EMAILS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: config.from, to: [address], subject, html }),
          signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
        });
      } catch (cause) {
        throw new Error('Resend injoignable', { cause });
      }
      await response.body?.cancel();
      if (!response.ok) throw new Error(`Envoi refusé par Resend (${response.status})`);
    },
  };
}

export function createMailer(
  env: EnvSource,
  log: LogLine = console.info,
  fetchFn: typeof fetch = fetch,
): Mailer {
  const config = readMailTransportConfig(env);
  switch (config.kind) {
    case 'log':
      return createLogMailer(log);
    case 'resend':
      return createResendMailer(config, requireEnv('ADMIN_EMAIL', env), fetchFn);
    default:
      return assertNever(config);
  }
}

function assertNever(value: never): never {
  throw new Error(`Transport de mail inattendu : ${JSON.stringify(value)}`);
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
