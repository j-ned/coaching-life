import { beforeEach } from 'vitest';
import { useRateLimitStore } from '../lib/rate-limit-store.js';
import { InMemoryRateLimitStore } from './rate-limit-fakes.js';

// Projet « unit » : aucun test ne doit joindre PostgreSQL. Chaque test repart d'un compteur en
// mémoire vide, à horloge figée, à la place du compteur partagé de production.
beforeEach(() => {
  useRateLimitStore(new InMemoryRateLimitStore());
});
