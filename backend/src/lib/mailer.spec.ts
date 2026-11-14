import { describe, expect, it } from 'vitest';
import { MissingEnvError } from './env.js';
import { createMailer } from './mailer.js';

const SMTP_ENV = {
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_USER: 'noreply@example.com',
  SMTP_PASS: 'smtp-pass',
  ADMIN_EMAIL: 'admin@example.com',
} as const;

function captureLog() {
  const lines: string[] = [];
  return { lines, log: (line: string) => lines.push(line) };
}

const RESEND_ENV = {
  RESEND_API_KEY: 're_test_key',
  MAIL_FROM: 'noreply@coaching.example',
  ADMIN_EMAIL: 'admin@example.com',
} as const;

const MAIL = {
  template: 'admin-new-message',
  to: { kind: 'address', address: 'marie.dupont@example.com' },
  subject: 'Nouveau message - Marie',
  html: '<p>Bonjour</p>',
} as const;

type Call = { readonly url: string; readonly init: RequestInit };

// Faux `fetch` : note chaque appel et rend la réponse (ou l'erreur réseau) demandée.
function fakeFetch(reply: () => Promise<Response>) {
  const calls: Call[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return reply();
  };
  return { calls, fetchFn };
}

const accepted = () => Promise.resolve(new Response('{"id":"email_1"}', { status: 200 }));

describe('createMailer', () => {
  it('reste strict en production : sans transport de mail configuré, le démarrage échoue', () => {
    expect(() => createMailer({ VERCEL_ENV: 'production' })).toThrow(MissingEnvError);
    expect(() => createMailer({ NODE_ENV: 'production' })).toThrow(/RESEND_API_KEY/);
  });

  describe('API Resend', () => {
    it('est choisie dès que RESEND_API_KEY est posée, même si SMTP est aussi configuré', () => {
      expect(createMailer({ ...RESEND_ENV, NODE_ENV: 'production' }).kind).toBe('resend');
      expect(createMailer({ ...SMTP_ENV, ...RESEND_ENV, NODE_ENV: 'production' }).kind).toBe('resend');
    });

    it('exige MAIL_FROM, en production comme ailleurs', () => {
      expect(() => createMailer({ ...RESEND_ENV, MAIL_FROM: undefined })).toThrow(/MAIL_FROM/);
      expect(() =>
        createMailer({ ...RESEND_ENV, MAIL_FROM: undefined, NODE_ENV: 'production' }),
      ).toThrow(MissingEnvError);
    });

    it('envoie le mail à l’API Resend, authentifié par la clé, avec l’expéditeur nommé', async () => {
      const { calls, fetchFn } = fakeFetch(accepted);

      await createMailer(RESEND_ENV, () => {}, fetchFn).send(MAIL);

      expect(calls).toHaveLength(1);
      const [call] = calls;
      expect(call?.url).toBe('https://api.resend.com/emails');
      expect(call?.init.method).toBe('POST');
      expect(new Headers(call?.init.headers).get('authorization')).toBe('Bearer re_test_key');
      expect(new Headers(call?.init.headers).get('content-type')).toBe('application/json');
      expect(JSON.parse(String(call?.init.body))).toEqual({
        from: 'Coaching Life <noreply@coaching.example>',
        to: ['marie.dupont@example.com'],
        subject: 'Nouveau message - Marie',
        html: '<p>Bonjour</p>',
      });
    });

    it('prend le nom d’expéditeur de MAIL_FROM_NAME', async () => {
      const { calls, fetchFn } = fakeFetch(accepted);

      await createMailer({ ...RESEND_ENV, MAIL_FROM_NAME: 'Cabinet Martin' }, () => {}, fetchFn).send(MAIL);

      expect(JSON.parse(String(calls[0]?.init.body)).from).toBe('Cabinet Martin <noreply@coaching.example>');
    });

    it('adresse à ADMIN_EMAIL un mail destiné à l’administratrice', async () => {
      const { calls, fetchFn } = fakeFetch(accepted);

      await createMailer(RESEND_ENV, () => {}, fetchFn).send({ ...MAIL, to: { kind: 'admin' } });

      expect(JSON.parse(String(calls[0]?.init.body)).to).toEqual(['admin@example.com']);
    });

    it('échoue sur un refus de Resend, avec son statut mais sans destinataire ni clé', async () => {
      const { fetchFn } = fakeFetch(() =>
        Promise.resolve(new Response('{"message":"marie.dupont@example.com invalide"}', { status: 422 })),
      );

      const sending = createMailer(RESEND_ENV, () => {}, fetchFn).send(MAIL);

      await expect(sending).rejects.toThrow(/422/);
      await sending.catch((error: unknown) => {
        const message = String(error instanceof Error ? error.message : error);
        expect(message).not.toContain('marie.dupont');
        expect(message).not.toContain('re_test_key');
      });
    });

    it('échoue quand Resend est injoignable, sans masquer la cause', async () => {
      const failure = new TypeError('fetch failed');
      const { fetchFn } = fakeFetch(() => Promise.reject(failure));

      await expect(createMailer(RESEND_ENV, () => {}, fetchFn).send(MAIL)).rejects.toMatchObject({
        cause: failure,
      });
    });
  });

  it('refuse en production une configuration SMTP incomplète', () => {
    expect(() =>
      createMailer({ ...SMTP_ENV, VERCEL_ENV: 'production', SMTP_PASS: undefined }),
    ).toThrow(/SMTP_PASS/);
  });

  it('utilise SMTP en production quand il est configuré', () => {
    expect(createMailer({ ...SMTP_ENV, VERCEL_ENV: 'production' }).kind).toBe('smtp');
  });

  it('sélectionne le transport « log » en preview quand SMTP n’est pas configuré', () => {
    expect(createMailer({ VERCEL_ENV: 'preview', NODE_ENV: 'production' }).kind).toBe('log');
  });

  it('sélectionne le transport « log » en développement quand SMTP n’est pas configuré', () => {
    expect(createMailer({}).kind).toBe('log');
  });

  it('le transport « log » n’écrit ni destinataire, ni sujet, ni contenu (codes, liens)', async () => {
    const { lines, log } = captureLog();
    const mailer = createMailer({ VERCEL_ENV: 'preview' }, log);

    await mailer.send({
      template: 'appointment-confirmation',
      to: { kind: 'address', address: 'marie.dupont@example.com' },
      subject: 'Votre code 482913',
      html: '<a href="https://example.com/reset?token=s3cr3t">Lien</a> code 482913',
    });

    expect(lines).toHaveLength(1);
    const [line] = lines;
    expect(line).toContain('appointment-confirmation');
    for (const sensitive of ['marie.dupont', 'example.com', '482913', 'token', 's3cr3t', 'http']) {
      expect(line).not.toContain(sensitive);
    }
  });
});
