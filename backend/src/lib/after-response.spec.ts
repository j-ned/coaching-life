import { afterEach, describe, expect, it, vi } from 'vitest';
import { afterResponse } from './after-response.js';

describe('afterResponse', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rend la main sans attendre la tâche', () => {
    let resolve: () => void = () => undefined;
    const pending = new Promise<void>((done) => {
      resolve = done;
    });
    let finished = false;
    const task = pending.then(() => {
      finished = true;
    });

    afterResponse('[test] en cours', task);

    expect(finished).toBe(false);
    resolve();
  });

  it('journalise l’échec de la tâche avec son libellé, sans rejet non géré', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const failure = new Error('Resend injoignable');

    try {
      afterResponse('[mail] message', Promise.reject(failure));
      await vi.waitFor(() => expect(logged).toHaveBeenCalledWith('[mail] message:', failure));
    } finally {
      process.off('unhandledRejection', unhandled);
    }

    expect(unhandled).not.toHaveBeenCalled();
  });

  it('ne journalise rien quand la tâche aboutit', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const task = Promise.resolve('envoyé');

    afterResponse('[mail] message', task);
    // Le gestionnaire posé par afterResponse passe avant cette attente, posée après lui.
    await task;

    expect(logged).not.toHaveBeenCalled();
  });
});
