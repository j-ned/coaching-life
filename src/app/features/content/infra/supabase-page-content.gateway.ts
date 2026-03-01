import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { PageContentGateway } from '../domain/gateways/page-content.gateway';
import type { PageContent, PageSlug } from '../domain/models/page-content.model';
import { Supabase } from '../../../core/services/supabase/supabase';
import { toPageContent, toSupabasePageUpdate } from './page-content.adapter';

@Injectable()
export class SupabasePageContentGateway implements PageContentGateway {
  private readonly supabase = inject(Supabase);

  getBySlug(slug: PageSlug): Observable<PageContent | null> {
    return from(this.supabase.client.from('pages').select('*').eq('slug', slug).maybeSingle()).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('[Pages] getBySlug failed:', error.message);
          return null;
        }
        return data ? toPageContent(data) : null;
      }),
    );
  }

  getAll(): Observable<readonly PageContent[]> {
    return from(
      this.supabase.client.from('pages').select('*').order('slug', { ascending: true }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map(toPageContent);
      }),
      catchError(() => of([])),
    );
  }

  update(
    slug: PageSlug,
    data: Partial<Omit<PageContent, 'id' | 'slug' | 'updatedAt'>>,
  ): Observable<PageContent> {
    return from(
      this.supabase.client
        .from('pages')
        .upsert({ slug, ...toSupabasePageUpdate(data) }, { onConflict: 'slug' })
        .select()
        .single(),
    ).pipe(
      map(({ data: row, error }) => {
        if (error) throw error;
        return toPageContent(row!);
      }),
    );
  }
}
