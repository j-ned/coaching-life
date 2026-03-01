import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GetPageContentUseCase } from '../../features/content/domain/use-cases/get-page-content.use-case';
import { DEFAULT_PAGES } from '../../features/content/domain/models/default-content';
import type { PageContent } from '../../features/content/domain/models/page-content.model';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-personal-development',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24' },
  template: `
    @let c = content();
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <div class="order-2 lg:order-1 rounded-3xl overflow-hidden shadow-xl lg:h-[700px]">
        <img
          [src]="c.imageUrl"
          width="800"
          height="800"
          [alt]="c.imageAlt"
          class="object-cover w-full h-full"
        />
      </div>
      <div class="order-1 lg:order-2">
        <h1 class="text-4xl lg:text-5xl font-bold text-slate-800 mb-6 flex items-center gap-4">
          <span class="p-3 bg-blue-50 text-blue-500 rounded-2xl">
            <app-icon name="book-open" size="xl" />
          </span>
          {{ c.title }}
        </h1>
        <p class="text-xl text-slate-600 leading-relaxed mb-6 font-light">{{ c.introduction }}</p>
        <div
          class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mt-8 relative overflow-hidden"
        >
          <div class="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-bl-full z-0"></div>
          <h2 class="text-2xl font-semibold text-slate-800 mb-6 relative z-10">
            {{ c.sectionTitle }}
          </h2>
          <ul class="space-y-4 relative z-10">
            @for (item of c.items; track $index) {
              <li class="flex items-start gap-3 text-slate-700">
                <div class="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2"></div>
                <span>
                  @if (item.title) {
                    <strong>{{ item.title }} :</strong>
                  }
                  {{ item.description }}
                </span>
              </li>
            }
          </ul>
          @if (c.extraText) {
            <div class="mt-8 pt-6 border-t border-slate-100">
              <p class="italic text-slate-500">"{{ c.extraText }}"</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PersonalDevelopment {
  private readonly getPageContent = inject(GetPageContentUseCase);

  protected readonly content = signal<PageContent>(DEFAULT_PAGES['personal-development']);

  constructor() {
    this.loadContent();
  }

  private async loadContent(): Promise<void> {
    const page = await this.getPageContent.execute('personal-development');
    this.content.set(page ?? DEFAULT_PAGES['personal-development']);
  }
}
