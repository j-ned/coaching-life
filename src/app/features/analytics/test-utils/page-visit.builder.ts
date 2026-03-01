import type { PageVisit, WeeklyDataPoint } from '../domain/models/analytics.model';

export class PageVisitBuilder {
  private entity: PageVisit = {
    id: 'visit-001',
    pagePath: '/life-coach',
    visitedAt: '2026-03-01T10:30:00.000Z',
    referrer: 'https://google.com',
    userAgent: 'Mozilla/5.0',
  };

  private constructor() {}

  static default(): PageVisitBuilder {
    return new PageVisitBuilder();
  }

  with<K extends keyof PageVisit>(key: K, value: PageVisit[K]): PageVisitBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): PageVisit {
    return { ...this.entity };
  }
}

export class WeeklyDataPointBuilder {
  private entity: WeeklyDataPoint = {
    weekLabel: 'S1',
    visits: 10,
    appointments: 3,
    messages: 2,
  };

  private constructor() {}

  static default(): WeeklyDataPointBuilder {
    return new WeeklyDataPointBuilder();
  }

  with<K extends keyof WeeklyDataPoint>(key: K, value: WeeklyDataPoint[K]): WeeklyDataPointBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): WeeklyDataPoint {
    return { ...this.entity };
  }
}
