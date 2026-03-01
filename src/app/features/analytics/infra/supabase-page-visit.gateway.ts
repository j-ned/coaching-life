import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, catchError } from 'rxjs';
import { PageVisitGateway } from '../domain/gateways/page-visit.gateway';
import type { PageVisit } from '../domain/models/analytics.model';
import { Supabase } from '../../../core/services/supabase/supabase';
import { toPageVisit } from './page-visit.adapter';

@Injectable()
export class SupabasePageVisitGateway implements PageVisitGateway {
  private readonly supabase = inject(Supabase);

  trackVisit(pagePath: string, referrer: string, userAgent: string): Observable<void> {
    return from(
      this.supabase.client
        .from('page_visits')
        .insert({ page_path: pagePath, referrer, user_agent: userAgent }),
    ).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  getVisitsBetween(start: string, end: string): Observable<readonly PageVisit[]> {
    return from(
      this.supabase.client
        .from('page_visits')
        .select('*')
        .gte('visited_at', start)
        .lte('visited_at', end)
        .order('visited_at', { ascending: true }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map(toPageVisit);
      }),
      catchError(() => of([])),
    );
  }

  countVisitsSince(date: string): Observable<number> {
    return from(
      this.supabase.client
        .from('page_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visited_at', date),
    ).pipe(
      map(({ count, error }) => {
        if (error) throw error;
        return count ?? 0;
      }),
      catchError(() => of(0)),
    );
  }
}
