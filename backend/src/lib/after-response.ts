import { waitUntil } from '@vercel/functions';

/**
 * Lance une tâche qui doit aboutir après l'envoi de la réponse. Sur Vercel, l'instance peut être
 * suspendue dès la réponse partie : sans `waitUntil`, un envoi SMTP en cours ne finirait jamais.
 * Hors Vercel le processus reste actif et `waitUntil` ne fait rien. Un échec est journalisé :
 * la réponse est déjà partie, il ne peut plus la changer.
 */
export function afterResponse(label: string, task: Promise<unknown>): void {
  waitUntil(
    task.then(
      () => undefined,
      (err: unknown) => {
        console.error(`${label}:`, err);
      },
    ),
  );
}
