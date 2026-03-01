import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { Supabase } from './core/services/supabase/supabase';
import { SupabaseServer } from './core/services/supabase/supabase-server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: Supabase, useClass: SupabaseServer },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
