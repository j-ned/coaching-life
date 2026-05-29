import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { GetPageContentUseCase } from '../../features/content/domain/use-cases/get-page-content.use-case';
import { DEFAULT_PAGES } from '../../features/content/domain/models/default-content';
import type { PageContent } from '../../features/content/domain/models/page-content.model';
import { Icon } from '../../shared/components/icon/icon';
import { Seo } from '../../core/seo/seo';
import { ROUTE_SEO } from '../../core/seo/route-seo';

@Component({
  selector: 'app-life-coach',
  imports: [Icon, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 section-y' },
  template: `
    @let c = content();
    <div class="grid lg:grid-cols-2 gap-12 max-md:gap-8 items-center">
      <div>
        <h1
          class="text-4xl lg:text-5xl font-bold text-slate-800 mb-6 max-md:mb-4 max-md:text-3xl flex items-center gap-4"
        >
          <span class="p-3 bg-brand-100 text-brand-700 rounded-2xl">
            <app-icon name="sparkles" size="xl" />
          </span>
          {{ c.title }}
        </h1>
        <p
          class="text-xl text-slate-600 leading-relaxed mb-6 max-md:mb-4 max-md:text-lg font-light"
        >
          {{ c.introduction }}
        </p>
        <div class="bg-brand-50/60 rounded-2xl border border-brand-100 p-8 max-md:p-6 mt-8">
          <h2 class="text-2xl font-semibold text-slate-800 mb-6 max-md:mb-4 max-md:text-xl">
            {{ c.sectionTitle }}
          </h2>
          <ul class="space-y-4">
            @for (item of c.items; track item.description) {
              <li class="flex items-start gap-3 text-slate-700">
                <app-icon name="check" size="lg" class="text-brand-700 shrink-0 mt-0.5" />
                <span>
                  @if (item.title) {
                    <strong>{{ item.title }} :</strong>
                  }
                  {{ item.description }}
                </span>
              </li>
            }
          </ul>
        </div>
      </div>
      <div class="rounded-3xl overflow-hidden shadow-xl lg:h-[700px] max-lg:h-96 max-md:h-72">
        @if (c.imageUrl) {
          <img
            [ngSrc]="c.imageUrl"
            width="800"
            height="800"
            priority
            [alt]="c.imageAlt"
            class="object-cover w-full h-full"
          />
        }
      </div>
    </div>
  `,
})
export class LifeCoach {
  private readonly getPageContent = inject(GetPageContentUseCase);
  private readonly _seo = inject(Seo);

  protected readonly content = signal<PageContent>(DEFAULT_PAGES['life-coach']);

  constructor() {
    this._seo.update(ROUTE_SEO['life-coach']);
    afterNextRender(() => {
      this.loadContent();
    });
  }

  private async loadContent(): Promise<void> {
    const page = await this.getPageContent.execute('life-coach');
    this.content.set(page ?? DEFAULT_PAGES['life-coach']);
  }
}
