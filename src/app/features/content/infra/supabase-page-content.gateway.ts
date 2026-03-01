import { Injectable, inject } from '@angular/core';
import { PageContentGateway } from '../domain/gateways/page-content.gateway';
import type { PageContent, PageSlug } from '../domain/models/page-content.model';
import { Supabase } from '../../../core/services/supabase/supabase';
import { toPageContent, toSupabasePageUpdate } from './page-content.adapter';

@Injectable()
export class SupabasePageContentGateway implements PageContentGateway {
  private readonly supabase = inject(Supabase);

  async getBySlug(slug: PageSlug): Promise<PageContent | null> {
    const { data, error } = await this.supabase.client
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      console.error('[Pages] getBySlug failed:', error.message);
      return null;
    }
    return data ? toPageContent(data) : null;
  }

  async getAll(): Promise<readonly PageContent[]> {
    const { data, error } = await this.supabase.client
      .from('pages')
      .select('*')
      .order('slug', { ascending: true });
    if (error) return [];
    return (data ?? []).map(toPageContent);
  }

  async update(
    slug: PageSlug,
    data: Partial<Omit<PageContent, 'id' | 'slug' | 'updatedAt'>>,
  ): Promise<PageContent> {
    const { data: row, error } = await this.supabase.client
      .from('pages')
      .upsert({ slug, ...toSupabasePageUpdate(data) }, { onConflict: 'slug' })
      .select()
      .single();
    if (error) throw error;
    return toPageContent(row!);
  }
}
