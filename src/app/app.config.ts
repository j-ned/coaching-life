import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { AuthGateway } from './features/auth/domain/gateways/auth.gateway';
import { HttpAuthGateway } from './features/auth/infra/http-auth.gateway';
import { AppointmentGateway } from './features/booking/domain/gateways/appointment.gateway';
import { HttpAppointmentGateway } from './features/booking/infra/http-appointment.gateway';
import { MessageGateway } from './features/contact/domain/gateways/message.gateway';
import { HttpMessageGateway } from './features/contact/infra/http-message.gateway';
import { PageContentGateway } from './features/content/domain/gateways/page-content.gateway';
import { HttpPageContentGateway } from './features/content/infra/http-page-content.gateway';
import { SiteSettingsGateway } from './features/content/domain/gateways/site-settings.gateway';
import { HttpSiteSettingsGateway } from './features/content/infra/http-site-settings.gateway';
import { ImageStorageGateway } from './features/content/domain/gateways/image-storage.gateway';
import { HttpImageStorageGateway } from './features/content/infra/http-image-storage.gateway';
import { PageVisitGateway } from './features/analytics/domain/gateways/page-visit.gateway';
import { HttpPageVisitGateway } from './features/analytics/infra/http-page-visit.gateway';

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
    { provide: AuthGateway, useClass: HttpAuthGateway },
    { provide: AppointmentGateway, useClass: HttpAppointmentGateway },
    { provide: MessageGateway, useClass: HttpMessageGateway },
    { provide: PageContentGateway, useClass: HttpPageContentGateway },
    { provide: SiteSettingsGateway, useClass: HttpSiteSettingsGateway },
    { provide: ImageStorageGateway, useClass: HttpImageStorageGateway },
    { provide: PageVisitGateway, useClass: HttpPageVisitGateway },
  ],
};
