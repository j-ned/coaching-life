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

describe('createMailer', () => {
  it('reste strict en production : SMTP absent fait échouer', () => {
    expect(() => createMailer({ VERCEL_ENV: 'production' })).toThrow(MissingEnvError);
    expect(() => createMailer({ NODE_ENV: 'production' })).toThrow(/SMTP_HOST/);
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
