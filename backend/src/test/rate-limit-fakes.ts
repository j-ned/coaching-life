import type { PurgeableRateLimitStore, RateLimitHit } from '../lib/rate-limit-store.js';

// 08:00:00.000 UTC : début exact d'une fenêtre pour toute durée divisant l'heure.
const START = new Date('2026-10-01T08:00:00.000Z');

export class ManualClock {
  private current: number;

  constructor(start: Date = START) {
    this.current = start.getTime();
  }

  now = (): number => this.current;

  advance(ms: number): void {
    this.current += ms;
  }
}

type Counter = { count: number; readonly expiresAt: number };

export class InMemoryRateLimitStore implements PurgeableRateLimitStore {
  readonly keys: string[] = [];
  purgeCount = 0;
  private readonly counters = new Map<string, Counter>();

  constructor(private readonly clock: ManualClock = new ManualClock()) {}

  get size(): number {
    return this.counters.size;
  }

  hit = async (key: string, windowMs: number): Promise<RateLimitHit> => {
    const now = this.clock.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const id = `${key}|${windowStart}`;
    const counter = this.counters.get(id) ?? { count: 0, expiresAt: windowStart + windowMs };
    counter.count += 1;
    this.counters.set(id, counter);
    this.keys.push(key);
    return { count: counter.count, retryAfterMs: counter.expiresAt - now };
  };

  purgeExpired = async (): Promise<void> => {
    this.purgeCount += 1;
    const now = this.clock.now();
    for (const [id, counter] of this.counters) {
      if (counter.expiresAt <= now) this.counters.delete(id);
    }
  };
}

export class UnreachableRateLimitStore implements PurgeableRateLimitStore {
  readonly failure = new Error('Connexion à la base perdue');

  hit = async (): Promise<RateLimitHit> => {
    throw this.failure;
  };

  purgeExpired = async (): Promise<void> => {
    throw this.failure;
  };
}
