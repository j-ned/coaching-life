export type RateLimitHit = {
  /** Nombre de requêtes comptées dans la fenêtre courante, celle-ci incluse. */
  readonly count: number;
  /** Temps restant avant la fin de la fenêtre courante. */
  readonly retryAfterMs: number;
};

// Port du compteur à fenêtre fixe. L'horloge appartient au stockage : en production c'est celle
// de PostgreSQL, unique pour toutes les instances de la fonction.
export type RateLimitStore = {
  readonly hit: (key: string, windowMs: number) => Promise<RateLimitHit>;
};

// Substitution du stockage : les routes construisent leurs limiteurs au chargement du module,
// sans injection possible. Sert aux tests (compteur en mémoire, sans base) ; la production ne
// l'appelle jamais et garde le stockage PostgreSQL du middleware.
let substitute: RateLimitStore | undefined;

export function useRateLimitStore(store: RateLimitStore): void {
  substitute = store;
}

export function substitutedRateLimitStore(): RateLimitStore | undefined {
  return substitute;
}

export type PurgeableRateLimitStore = RateLimitStore & {
  readonly purgeExpired: () => Promise<void>;
};

type OpportunisticPurgeOptions = {
  readonly intervalMs: number;
  readonly now: () => number;
  readonly onPurgeError: (err: unknown) => void;
};

// Purge au fil de l'eau, sans tâche planifiée : au plus une par intervalle et par instance, en
// commençant au premier comptage (une instance éphémère purge donc au moins une fois).
// Elle est attendue avant de rendre la main, car une fonction Vercel peut être gelée dès la
// réponse envoyée. Son échec ne doit jamais refuser une requête déjà comptée : il est remis à
// `onPurgeError` et la purge sera retentée à l'intervalle suivant.
export function withOpportunisticPurge(
  store: PurgeableRateLimitStore,
  { intervalMs, now, onPurgeError }: OpportunisticPurgeOptions,
): RateLimitStore {
  let nextPurgeAt = Number.NEGATIVE_INFINITY;

  return {
    hit: async (key, windowMs) => {
      const hit = await store.hit(key, windowMs);
      const at = now();
      if (at >= nextPurgeAt) {
        // Réarmé avant l'attente : les requêtes concurrentes de l'instance ne purgent pas aussi.
        nextPurgeAt = at + intervalMs;
        try {
          await store.purgeExpired();
        } catch (err) {
          onPurgeError(err);
        }
      }
      return hit;
    },
  };
}
