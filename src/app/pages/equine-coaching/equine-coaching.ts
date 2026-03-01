import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GetPageContentUseCase } from '../../features/content/domain/use-cases/get-page-content.use-case';
import { DEFAULT_PAGES } from '../../features/content/domain/models/default-content';
import type { PageContent } from '../../features/content/domain/models/page-content.model';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-equine-coaching',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24' },
  template: `
    @let c = content();
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <h1 class="text-4xl lg:text-5xl font-bold text-slate-800 mb-6 flex items-center gap-4">
          <span class="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <app-icon name="smile" size="xl" />
          </span>
          {{ c.title }}
        </h1>
        <p class="text-xl text-slate-600 leading-relaxed mb-6 font-light">{{ c.introduction }}</p>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mt-8">
          <h2 class="text-2xl font-semibold text-slate-800 mb-6">{{ c.sectionTitle }}</h2>
          <ul class="space-y-4 text-slate-700">
            @for (item of c.items; track $index) {
              <li class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0"
                >
                  {{ $index + 1 }}
                </div>
                <div>
                  @if (item.title) {
                    <strong class="block text-slate-800">{{ item.title }}</strong>
                  }
                  <span class="text-sm">{{ item.description }}</span>
                </div>
              </li>
            }
          </ul>
          @if (c.extraText) {
            <div class="mt-8 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
              <strong class="text-slate-800">À noter :</strong> {{ c.extraText }}
            </div>
          }
        </div>
      </div>
      <div class="rounded-3xl overflow-hidden shadow-xl lg:h-[700px]">
        <img
          [src]="c.imageUrl"
          width="800"
          height="800"
          [alt]="c.imageAlt"
          class="object-cover w-full h-full"
        />
      </div>
    </div>
  `,
})
export class EquineCoaching {
  private readonly getPageContent = inject(GetPageContentUseCase);

  protected readonly content = signal<PageContent>(DEFAULT_PAGES['equine-coaching']);

  constructor() {
    this.loadContent();
  }

  private async loadContent(): Promise<void> {
    const page = await this.getPageContent.execute('equine-coaching');
    this.content.set(page ?? DEFAULT_PAGES['equine-coaching']);
  }
}
