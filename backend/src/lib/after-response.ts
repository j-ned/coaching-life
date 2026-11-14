/**
 * Lance une tâche qui se termine après l'envoi de la réponse (envoi de mails). Le processus Node
 * reste actif, rien ne l'interrompt. Un échec est journalisé : la réponse est déjà partie, il ne
 * peut plus la changer, et il ne doit pas devenir un rejet non géré.
 */
export function afterResponse(label: string, task: Promise<unknown>): void {
  void task.then(
    () => undefined,
    (err: unknown) => {
      console.error(`${label}:`, err);
    },
  );
}
