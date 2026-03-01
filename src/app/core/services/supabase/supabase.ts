import { SupabaseClient } from '@supabase/supabase-js';

export abstract class Supabase {
  abstract readonly client: SupabaseClient;
}
