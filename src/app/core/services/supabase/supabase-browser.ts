import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { environment } from '../../../../environments/environment';
import { Supabase } from './supabase';

@Injectable()
export class SupabaseBrowser extends Supabase {
  readonly client: SupabaseClient;

  constructor() {
    super();
    this.client = createBrowserClient(
      environment.supabase.url,
      environment.supabase.key,
    );
  }
}
