import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { AuthGateway } from './features/auth/domain/gateways/auth.gateway';
import { HttpAuthGateway } from './features/auth/infra/http-auth.gateway';
import { AppointmentGateway } from './features/booking/domain/gateways/appointment.gateway';
import { SupabaseAppointmentGateway } from './features/booking/infra/supabase-appointment.gateway';
import { MessageGateway } from './features/contact/domain/gateways/message.gateway';
import { SupabaseMessageGateway } from './features/contact/infra/supabase-message.gateway';
import { PageContentGateway } from './features/content/domain/gateways/page-content.gateway';
import { SupabasePageContentGateway } from './features/content/infra/supabase-page-content.gateway';
import { SiteSettingsGateway } from './features/content/domain/gateways/site-settings.gateway';
import { SupabaseSiteSettingsGateway } from './features/content/infra/supabase-site-settings.gateway';
import { ImageStorageGateway } from './features/content/domain/gateways/image-storage.gateway';
import { SupabaseImageStorageGateway } from './features/content/infra/supabase-image-storage.gateway';
import { PageVisitGateway } from './features/analytics/domain/gateways/page-visit.gateway';
import { SupabasePageVisitGateway } from './features/analytics/infra/supabase-page-visit.gateway';
import { Supabase } from './core/services/supabase/supabase';
import { SupabaseBrowser } from './core/services/supabase/supabase-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
    provideCharts(withDefaultRegisterables()),
    { provide: Supabase, useClass: SupabaseBrowser },
    { provide: AuthGateway, useClass: HttpAuthGateway },
    { provide: AppointmentGateway, useClass: SupabaseAppointmentGateway },
    { provide: MessageGateway, useClass: SupabaseMessageGateway },
    { provide: PageContentGateway, useClass: SupabasePageContentGateway },
    { provide: SiteSettingsGateway, useClass: SupabaseSiteSettingsGateway },
    { provide: ImageStorageGateway, useClass: SupabaseImageStorageGateway },
    { provide: PageVisitGateway, useClass: SupabasePageVisitGateway },
  ],
};
