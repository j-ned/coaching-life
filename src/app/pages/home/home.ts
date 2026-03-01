import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Booking } from '../../features/booking/pages/booking';
import { ContactForm } from '../../features/contact/contact-form';
import { Reviews } from '../../features/reviews/reviews';
import { Icon } from '../../shared/components/icon/icon';
import { GetSiteSettingUseCase } from '../../features/content/domain/use-cases/get-site-setting.use-case';
import { GetAllPagesUseCase } from '../../features/content/domain/use-cases/get-all-pages.use-case';
import { DEFAULT_HERO, DEFAULT_HOME_CTA, DEFAULT_HOME_SERVICES, DEFAULT_PAGES } from '../../features/content/domain/models/default-content';
import type { HeroSettings, HomeCTASettings, HomeServicesSettings } from '../../features/content/domain/models/site-settings.model';
import type { PageSlug } from '../../features/content/domain/models/page-content.model';

const SERVICE_CARDS: readonly { slug: PageSlug; route: string; iconBg: string; iconColor: string; iconName: string }[] = [
  {
    slug: 'life-coach',
    route: '/life-coach',
    iconBg: 'bg-brand-100',
    iconColor: 'text-brand-500',
    iconName: 'sparkles',
  },
  {
    slug: 'personal-development',
    route: '/personal-development',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    iconName: 'book-open',
  },
  {
    slug: 'equine-coaching',
    route: '/equine-coaching',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    iconName: 'smile',
  },
  {
    slug: 'neuroatypical-parents',
    route: '/neuroatypical-parents',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    iconName: 'heart',
  },
];

@Component({
  selector: 'app-home',
  imports: [RouterLink, Booking, ContactForm, Reviews, Icon, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let h = hero();
    @let svc = services();
    @let cta = ctaSettings();

    <section aria-labelledby="hero-heading" class="relative bg-brand-50/30 overflow-hidden">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 grid lg:grid-cols-2 gap-12 items-center"
      >
        <div class="text-left z-10">
          <span
            class="inline-block py-1 px-3 rounded-full bg-brand-100 text-brand-600 font-semibold tracking-wider text-sm mb-6"
            >COACHING LIFE</span
          >
          <h1
            id="hero-heading"
            class="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight"
          >
            {{ h.title }}
          </h1>
          <p class="text-xl text-slate-600 mb-10 leading-relaxed max-w-lg">{{ h.subtitle }}</p>
          <div class="flex flex-wrap gap-4">
            <button
              type="button"
              (click)="scrollTo('contact')"
              class="bg-brand-500 text-white px-8 py-4 rounded-full font-medium hover:bg-brand-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 cursor-pointer"
            >
              {{ h.ctaPrimaryText }}
            </button>
            <button
              type="button"
              (click)="scrollTo('services')"
              class="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-full font-medium hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            >
              {{ h.ctaSecondaryText }}
            </button>
          </div>
        </div>
        <div
          class="relative z-10 lg:h-150 rounded-3xl overflow-hidden shadow-2xl transform lg:rotate-2 hover:rotate-0 transition-transform duration-500"
        >
          <img
            [ngSrc]="h.imageUrl"
            width="800"
            height="800"
            [alt]="h.imageAlt"
            class="object-cover w-full h-full"
          />
        </div>
      </div>

      <div
        class="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-brand-100/50 blur-3xl z-0"
      ></div>
      <div
        class="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-50/50 blur-3xl z-0"
      ></div>
    </section>

    <section
      id="services"
      aria-labelledby="services-heading"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
    >
      <div class="text-center mb-16">
        <span
          class="inline-block py-1 px-3 rounded-full bg-brand-100 text-brand-600 font-semibold tracking-wider text-sm mb-4"
          >{{ svc.badge }}</span
        >
        <h2 id="services-heading" class="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
          {{ svc.title }}
        </h2>
        <p class="text-lg text-slate-600 max-w-2xl mx-auto">{{ svc.subtitle }}</p>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        @for (card of serviceCards; track card.slug) {
          <article
            class="group relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div class="h-48 overflow-hidden">
              <img
                [ngSrc]="getPageImage(card.slug)"
                width="400"
                height="300"
                [alt]="getPageTitle(card.slug)"
                class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div class="p-6">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                [class]="card.iconBg + ' ' + card.iconColor"
              >
                <app-icon [name]="card.iconName" size="md" />
              </div>
              <h3 class="text-lg font-semibold text-slate-800 mb-2">
                {{ getPageTitle(card.slug) }}
              </h3>
              <p class="text-slate-600 text-sm mb-4 line-clamp-3">{{ getPageIntro(card.slug) }}</p>
              <a
                [routerLink]="card.route"
                class="inline-flex items-center gap-1 text-brand-500 font-medium text-sm hover:text-brand-600 transition-colors"
              >
                En savoir plus
                <app-icon
                  name="chevron-right"
                  size="sm"
                  class="group-hover:translate-x-1 transition-transform"
                />
              </a>
            </div>
          </article>
        }
      </div>
    </section>

    <app-reviews></app-reviews>

    <section
      id="contact"
      aria-labelledby="contact-heading"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
    >
      <div class="text-center mb-12">
        <span
          class="inline-block py-1 px-3 rounded-full bg-brand-100 text-brand-600 font-semibold tracking-wider text-sm mb-4"
          >{{ cta.badge }}</span
        >
        <h2 id="contact-heading" class="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
          {{ cta.title }}
        </h2>
        <p class="text-lg text-slate-600 max-w-2xl mx-auto">{{ cta.subtitle }}</p>
      </div>

      <div class="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto mb-12">
        <button
          type="button"
          (click)="openPanel('booking')"
          [class.ring-2]="activePanel() === 'booking'"
          [class.ring-brand-500]="activePanel() === 'booking'"
          class="group bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
        >
          <div
            class="w-14 h-14 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mb-5"
          >
            <app-icon name="calendar" size="lg" />
          </div>
          <h3 class="text-xl font-semibold text-slate-800 mb-2">Prendre rendez-vous</h3>
          <p class="text-slate-600 text-sm">
            Choisissez une date et un créneau pour votre séance de coaching personnalisée.
          </p>
          <span
            class="inline-flex items-center gap-1 text-brand-500 font-medium text-sm mt-4 group-hover:gap-2 transition-all"
          >
            Ouvrir le calendrier
            <app-icon name="chevron-right" size="sm" />
          </span>
        </button>

        <button
          type="button"
          (click)="openPanel('contact')"
          [class.ring-2]="activePanel() === 'contact'"
          [class.ring-brand-500]="activePanel() === 'contact'"
          class="group bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
        >
          <div
            class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-5"
          >
            <app-icon name="mail" size="lg" />
          </div>
          <h3 class="text-xl font-semibold text-slate-800 mb-2">Me contacter</h3>
          <p class="text-slate-600 text-sm">
            Une question ? Envoyez-moi un message et je vous répondrai rapidement.
          </p>
          <span
            class="inline-flex items-center gap-1 text-brand-500 font-medium text-sm mt-4 group-hover:gap-2 transition-all"
          >
            Ouvrir le formulaire
            <app-icon name="chevron-right" size="sm" />
          </span>
        </button>
      </div>

      @if (activePanel() === 'booking') {
        <div class="max-w-5xl mx-auto">
          <app-booking />
        </div>
      } @else if (activePanel() === 'contact') {
        <div class="max-w-2xl mx-auto">
          <app-contact-form />
        </div>
      }
    </section>
  `,
})
export class Home {
  private readonly getSiteSetting = inject(GetSiteSettingUseCase);
  private readonly getAllPages = inject(GetAllPagesUseCase);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly hero = toSignal(
    this.getSiteSetting.execute<HeroSettings>('home_hero').pipe(map((v) => v ?? DEFAULT_HERO)),
    { initialValue: DEFAULT_HERO },
  );

  protected readonly services = toSignal(
    this.getSiteSetting
      .execute<HomeServicesSettings>('home_services')
      .pipe(map((v) => v ?? DEFAULT_HOME_SERVICES)),
    { initialValue: DEFAULT_HOME_SERVICES },
  );

  protected readonly ctaSettings = toSignal(
    this.getSiteSetting
      .execute<HomeCTASettings>('home_cta')
      .pipe(map((v) => v ?? DEFAULT_HOME_CTA)),
    { initialValue: DEFAULT_HOME_CTA },
  );

  protected readonly pages = toSignal(this.getAllPages.execute(), { initialValue: [] });
  protected readonly serviceCards = SERVICE_CARDS;
  protected readonly activePanel = signal<'booking' | 'contact' | null>(null);

  protected getPageTitle(slug: PageSlug): string {
    const page = this.pages().find((p) => p.slug === slug);
    return page?.title ?? DEFAULT_PAGES[slug].title;
  }

  protected getPageIntro(slug: PageSlug): string {
    const page = this.pages().find((p) => p.slug === slug);
    const intro = page?.introduction ?? DEFAULT_PAGES[slug].introduction;
    return intro.length > 120 ? intro.substring(0, 120) + '...' : intro;
  }

  protected getPageImage(slug: PageSlug): string {
    const page = this.pages().find((p) => p.slug === slug);
    return page?.imageUrl || DEFAULT_PAGES[slug].imageUrl;
  }

  protected openPanel(panel: 'booking' | 'contact'): void {
    this.activePanel.set(this.activePanel() === panel ? null : panel);
  }

  protected scrollTo(sectionId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const id = sectionId.replace(/^#/, '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
