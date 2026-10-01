import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { PageContent } from '@features/content/domain/models/page-content.model';
import { Icon } from '@shared/components/icon/icon';
import { ScrollScale } from '@shared/motion/scroll-scale';

/** Gabarit éditorial commun aux pages de spécialité (contenu éditable depuis le dashboard). */
@Component({
  selector: 'app-service-page',
  imports: [NgOptimizedImage, RouterLink, Icon, ScrollScale],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let c = content();

    <section class="bg-warm-mesh grain overflow-hidden">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-36 pb-20 md:pt-48 md:pb-28">
        <span
          class="inline-flex size-14 items-center justify-center rounded-2xl bg-white/70 text-brand-700 ring-1 ring-brand-200/60"
          aria-hidden="true"
        >
          <app-icon [name]="icon()" size="lg" />
        </span>
        <h1
          class="mt-8 max-w-5xl font-display text-[clamp(2.75rem,6vw,5.5rem)] font-bold leading-[1.02] text-slate-900"
        >
          {{ c.title }}
        </h1>
        <div class="mt-10 grid gap-10 md:grid-cols-12 md:items-end">
          <p
            class="md:col-span-8 text-xl leading-relaxed text-slate-700 md:text-2xl md:leading-relaxed"
          >
            {{ c.introduction }}
          </p>
          <div class="md:col-span-4 md:justify-self-end">
            <a
              routerLink="/"
              fragment="contact"
              class="inline-flex items-center gap-3 rounded-full bg-brand-700 px-8 py-4 font-semibold text-white shadow-lg shadow-brand-500/25 transition-colors hover:bg-brand-800"
            >
              Prendre rendez-vous
              <app-icon name="arrow-right" size="sm" />
            </a>
          </div>
        </div>
      </div>
    </section>

    @if (c.imageUrl) {
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-2 md:-mt-6">
        <div
          appScrollScale
          class="relative aspect-4/3 overflow-hidden rounded-[2rem] bg-brand-100 md:aspect-21/9 md:rounded-[3rem]"
        >
          <img
            [ngSrc]="c.imageUrl"
            fill
            priority
            sizes="100vw"
            [alt]="c.imageAlt"
            class="object-cover"
          />
        </div>
      </div>
    }

    <section class="section-chapter" aria-labelledby="service-section-heading">
      <div class="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-12 lg:gap-20 lg:px-8">
        <div class="lg:col-span-5">
          <div class="lg:sticky lg:top-32">
            <h2
              id="service-section-heading"
              class="font-display text-[clamp(2rem,3.5vw,3rem)] font-bold leading-[1.08] text-slate-900"
            >
              {{ c.sectionTitle }}
            </h2>
            @if (c.extraText) {
              <p class="mt-8 border-t border-brand-200 pt-6 text-lg leading-relaxed text-slate-600">
                {{ c.extraText }}
              </p>
            }
          </div>
        </div>

        <ol class="lg:col-span-7 divide-y divide-brand-100 border-y border-brand-100">
          @for (item of c.items; track $index) {
            <li class="group flex gap-6 py-8 md:gap-8 md:py-10">
              <span
                class="mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-lg font-bold text-brand-700 ring-1 ring-brand-100 transition-colors duration-500 group-hover:bg-brand-700 group-hover:text-white"
                aria-hidden="true"
                >{{ $index + 1 }}</span
              >
              <div>
                @if (item.title) {
                  <h3 class="font-display text-2xl font-semibold text-slate-900">
                    {{ item.title }}
                  </h3>
                }
                <p
                  class="text-lg leading-relaxed text-slate-600"
                  [class.mt-2]="item.title"
                  [class.text-slate-800]="!item.title"
                >
                  {{ item.description }}
                </p>
              </div>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
})
export class ServicePage {
  readonly content = input.required<PageContent>();
  readonly icon = input.required<string>();
}
