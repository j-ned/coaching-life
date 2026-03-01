import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { GetPageContentUseCase } from '../../features/content/domain/use-cases/get-page-content.use-case';
import { DEFAULT_PAGES } from '../../features/content/domain/models/default-content';
import { Icon } from '../../shared/components/icon/icon';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-neuroatypical-parents',
  imports: [Icon, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24' },
  template: `
    @let c = content();
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <div class="order-2 lg:order-1 rounded-3xl overflow-hidden shadow-xl lg:h-175">
        <img
          [ngSrc]="c.imageUrl"
          width="800"
          height="800"
          [alt]="c.imageAlt"
          class="object-cover w-full h-full"
        />
      </div>
      <div class="order-1 lg:order-2">
        <h1 class="text-4xl lg:text-5xl font-bold text-slate-800 mb-6 flex items-center gap-4">
          <span class="p-3 bg-rose-50 text-rose-500 rounded-2xl">
            <app-icon name="smile" size="xl" />
          </span>
          {{ c.title }}
        </h1>
        <p class="text-xl text-slate-600 leading-relaxed mb-6 font-light">{{ c.introduction }}</p>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mt-8">
          <h2 class="text-2xl font-semibold text-slate-800 mb-6">{{ c.sectionTitle }}</h2>
          <ul class="space-y-4 text-slate-700">
            @for (item of c.items; track $index) {
              <li class="flex items-start gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0 mt-0.5"
                >
                  <app-icon name="heart" size="sm" />
                </div>
                <div>
                  @if (item.title) {
                    <strong class="block text-slate-800">{{ item.title }}</strong>
                  }
                  <span>{{ item.description }}</span>
                </div>
              </li>
            }
          </ul>
          <div class="mt-6">
            <a
              href="/contact"
              class="text-brand-500 hover:text-brand-600 font-medium inline-flex items-center gap-2 transition-colors"
            >
              Prenons le temps d'échanger
              <app-icon name="arrow-right" size="sm" />
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class NeuroatypicalParents {
  private readonly getPageContent = inject(GetPageContentUseCase);

  protected readonly content = toSignal(
    this.getPageContent
      .execute('neuroatypical-parents')
      .pipe(map((v) => v ?? DEFAULT_PAGES['neuroatypical-parents'])),
    { initialValue: DEFAULT_PAGES['neuroatypical-parents'] },
  );
}
