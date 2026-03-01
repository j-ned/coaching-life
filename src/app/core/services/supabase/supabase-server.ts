import { inject, Injectable, REQUEST } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { environment } from '../../../../environments/environment';
import { Supabase } from './supabase';

function parseCookies(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(';').map((pair) => {
    const [name, ...rest] = pair.trim().split('=');
    return { name, value: rest.join('=') };
  });
}

@Injectable()
export class SupabaseServer extends Supabase {
  readonly client: SupabaseClient;

  constructor() {
    super();
    const request = inject<Request | null>(REQUEST, { optional: true });

    const cookieHeader = request?.headers?.get('cookie') ?? '';

    this.client = createServerClient(
      environment.supabase.url,
      environment.supabase.key,
      {
        cookies: {
          getAll: () => parseCookies(cookieHeader),
          setAll: () => {
            // No-op during SSR rendering — cookies are managed by the browser client
          },
        },
      },
    );
  }
}
