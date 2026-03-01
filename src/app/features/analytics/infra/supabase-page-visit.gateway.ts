import { Injectable, inject } from '@angular/core';
import { PageVisitGateway } from '../domain/gateways/page-visit.gateway';
import type { PageVisit } from '../domain/models/analytics.model';
import { Supabase } from '../../../core/services/supabase/supabase';
import { toPageVisit } from './page-visit.adapter';

@Injectable()
export class SupabasePageVisitGateway implements PageVisitGateway {
  private readonly supabase = inject(Supabase);

  async trackVisit(pagePath: string, referrer: string, userAgent: string): Promise<void> {
    await this.supabase.client
      .from('page_visits')
      .insert({ page_path: pagePath, referrer, user_agent: userAgent });
  }

  async getVisitsBetween(start: string, end: string): Promise<readonly PageVisit[]> {
    const { data, error } = await this.supabase.client
      .from('page_visits')
      .select('*')
      .gte('visited_at', start)
      .lte('visited_at', end)
      .order('visited_at', { ascending: true });
    if (error) return [];
    return (data ?? []).map(toPageVisit);
  }

  async countVisitsSince(date: string): Promise<number> {
    const { count, error } = await this.supabase.client
      .from('page_visits')
      .select('*', { count: 'exact', head: true })
      .gte('visited_at', date);
    if (error) return 0;
    return count ?? 0;
  }
}
