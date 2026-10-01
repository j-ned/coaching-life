import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GetPageContentUseCase } from '@features/content/domain/use-cases/get-page-content.use-case';
import { DEFAULT_PAGES } from '@features/content/domain/models/default-content';
import type { PageContent } from '@features/content/domain/models/page-content.model';
import { Seo } from '@core/seo/seo';
import { ROUTE_SEO } from '@core/seo/route-seo';
import { ServicePage } from '../service-page/service-page';

@Component({
  selector: 'app-personal-development',
  imports: [ServicePage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<app-service-page [content]="content()" icon="book-open" />`,
})
export class PersonalDevelopment {
  private readonly getPageContent = inject(GetPageContentUseCase);
  private readonly _seo = inject(Seo);

  protected readonly content = signal<PageContent>(DEFAULT_PAGES['personal-development']);

  constructor() {
    this._seo.update(ROUTE_SEO['personal-development']);
    afterNextRender(() => {
      this.loadContent();
    });
  }

  private async loadContent(): Promise<void> {
    const page = await this.getPageContent.execute('personal-development');
    this.content.set(page ?? DEFAULT_PAGES['personal-development']);
  }
}
