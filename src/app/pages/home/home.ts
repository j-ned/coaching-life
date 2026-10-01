import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Booking } from '@features/booking/pages/booking';
import { ContactForm } from '@features/contact/contact-form';
import { Reviews } from '@features/reviews/reviews';
import { Icon } from '@shared/components/icon/icon';
import { ScrubText } from '@shared/motion/scrub-text';
import { GetSiteSettingUseCase } from '@features/content/domain/use-cases/get-site-setting.use-case';
import { GetAllPagesUseCase } from '@features/content/domain/use-cases/get-all-pages.use-case';
import { Seo } from '@core/seo/seo';
import { ROUTE_SEO } from '@core/seo/route-seo';
import { GOOGLE_REVIEWS_URL } from '@core/config';
import {
  DEFAULT_HERO,
  DEFAULT_HOME_CTA,
  DEFAULT_HOME_SERVICES,
  DEFAULT_PAGES,
} from '@features/content/domain/models/default-content';
import type {
  HeroSettings,
  HomeCTASettings,
  HomeServicesSettings,
} from '@features/content/domain/models/site-settings.model';
import type { PageContent, PageSlug } from '@features/content/domain/models/page-content.model';

type BentoVariant = 'feature' | 'wide' | 'soft' | 'deep';

// Bento lg 4x2 : feature 2x2 + wide 2x1 + soft 1x1 + deep 1x1 = 8 cellules, aucune case vide.
// md 2 colonnes : feature 2 + wide 2 + soft 1 + deep 1 = 2x3, aucune case vide.
const SERVICE_CARDS: readonly {
  slug: PageSlug;
  route: string;
  iconName: string;
  variant: BentoVariant;
  span: string;
}[] = [
  {
    slug: 'life-coach',
    route: '/life-coach',
    iconName: 'sparkles',
    variant: 'feature',
    span: 'md:col-span-2 lg:row-span-2 min-h-[26rem] lg:min-h-0',
  },
  {
    slug: 'equine-coaching',
    route: '/equine-coaching',
    iconName: 'smile',
    variant: 'wide',
    span: 'md:col-span-2 min-h-[20rem]',
  },
  {
    slug: 'personal-development',
    route: '/personal-development',
    iconName: 'book-open',
    variant: 'soft',
    span: 'min-h-[18rem]',
  },
  {
    slug: 'neuroatypical-parents',
    route: '/neuroatypical-parents',
    iconName: 'heart',
    variant: 'deep',
    span: 'min-h-[18rem]',
  },
];

type HeadingSegment = { kind: 'text'; text: string } | { kind: 'pill'; src: string };

const MANIFESTO =
  'Chaque accompagnement commence par votre histoire. Une écoute active, de la bienveillance, et des outils concrets pour avancer à votre rythme, sans jugement.';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Booking, ContactForm, Reviews, Icon, NgOptimizedImage, ScrubText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let h = hero();
    @let svc = services();
    @let cta = ctaSettings();

    <section aria-labelledby="hero-heading" class="bg-warm-mesh grain overflow-hidden">
      <div
        class="mx-auto grid max-w-7xl gap-16 px-4 pt-32 pb-24 sm:px-6 md:pt-44 md:pb-36 lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-8"
      >
        <div class="lg:col-span-7">
          <h1
            id="hero-heading"
            class="max-w-4xl text-balance font-display text-[clamp(2.75rem,5.2vw,5.25rem)] font-bold leading-[1.02] text-slate-900"
          >
            {{ h.title }}
          </h1>
          <p class="mt-8 max-w-xl text-xl leading-relaxed text-slate-600 max-md:text-lg">
            {{ h.subtitle }}
          </p>
          <div class="mt-12 flex flex-wrap gap-4">
            <button
              type="button"
              (click)="scrollTo(h.ctaPrimaryLink || 'contact')"
              class="inline-flex items-center gap-3 rounded-full bg-brand-700 px-8 py-4 font-semibold text-white shadow-lg shadow-brand-500/25 transition-colors hover:bg-brand-800 cursor-pointer"
            >
              {{ h.ctaPrimaryText }}
              <app-icon name="arrow-right" size="sm" />
            </button>
            <button
              type="button"
              (click)="scrollTo(h.ctaSecondaryLink || 'services')"
              class="rounded-full bg-white/80 px-8 py-4 font-semibold text-slate-900 ring-1 ring-slate-900/10 transition-colors hover:bg-white cursor-pointer"
            >
              {{ h.ctaSecondaryText }}
            </button>
          </div>
        </div>

        <div class="lg:col-span-5">
          <div
            class="relative mx-auto aspect-4/5 w-full max-w-md overflow-hidden rounded-t-full rounded-b-[2.5rem] bg-linear-to-b from-brand-200 to-brand-400 shadow-2xl shadow-brand-900/15 lg:max-w-none"
          >
            @if (h.imageUrl) {
              <img
                [ngSrc]="h.imageUrl"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 90vw"
                [alt]="h.imageAlt"
                class="object-cover"
              />
            } @else {
              <div class="flex h-full items-center justify-center text-white/80" aria-hidden="true">
                <app-icon name="sparkles" size="xl" />
              </div>
            }
          </div>
        </div>
      </div>
    </section>

    <section id="services" aria-labelledby="services-heading" class="section-chapter scroll-mt-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="max-w-5xl">
          @if (svc.badge) {
            <p class="mb-6 flex items-center gap-3 text-sm font-semibold text-brand-700">
              <span class="h-px w-10 bg-brand-300" aria-hidden="true"></span>
              {{ svc.badge }}
            </p>
          }
          <h2
            id="services-heading"
            class="font-display text-[clamp(2.25rem,4.5vw,4rem)] font-bold leading-[1.12] text-slate-900"
          >
            @for (seg of servicesHeading(); track $index) {
              @if (seg.kind === 'text') {
                {{ seg.text }}
              } @else {
                <span
                  class="mx-1 inline-block h-[0.82em] w-[1.9em] translate-y-[0.06em] overflow-hidden rounded-full bg-brand-100 align-baseline ring-2 ring-white"
                  aria-hidden="true"
                  ><img
                    [ngSrc]="seg.src"
                    width="120"
                    height="64"
                    alt=""
                    class="h-full w-full object-cover"
                /></span>
              }
            }
          </h2>
          <p class="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">{{ svc.subtitle }}</p>
        </div>

        <div
          class="mt-16 grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[repeat(2,minmax(19rem,auto))]"
        >
          @for (card of serviceCardsResolved(); track card.slug) {
            <a
              [routerLink]="card.route"
              class="group relative isolate flex flex-col overflow-hidden rounded-[2rem] p-8 transition-shadow duration-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"
              [class]="card.span + ' ' + variantClass[card.variant]"
            >
              @if (card.variant === 'feature' || card.variant === 'wide') {
                @if (card.image) {
                  <img
                    [ngSrc]="card.image"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    alt=""
                    class="-z-20 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                }
                <div
                  class="absolute inset-0 -z-10 bg-linear-to-t from-brand-950/95 via-brand-950/65 to-brand-950/10"
                  aria-hidden="true"
                ></div>
              }

              <span
                class="inline-flex size-12 items-center justify-center rounded-2xl"
                [class]="iconClass[card.variant]"
                aria-hidden="true"
              >
                <app-icon [name]="card.iconName" size="md" />
              </span>

              <div class="mt-auto pt-16">
                <h3
                  class="font-display font-bold leading-tight"
                  [class]="
                    card.variant === 'feature'
                      ? 'text-[clamp(1.9rem,3vw,2.75rem)]'
                      : 'text-2xl md:text-[1.7rem]'
                  "
                >
                  {{ card.title }}
                </h3>
                <p
                  class="mt-3 max-w-lg leading-relaxed"
                  [class]="card.variant === 'soft' ? 'text-slate-600' : 'text-white/80'"
                  [class.line-clamp-3]="card.variant !== 'feature'"
                >
                  {{ card.variant === 'feature' ? card.introFull : card.intro }}
                </p>
                <span
                  class="mt-6 inline-flex items-center gap-2 font-semibold"
                  [class]="card.variant === 'soft' ? 'text-brand-800' : 'text-white'"
                >
                  Découvrir
                  <app-icon
                    name="arrow-right"
                    size="sm"
                    class="transition-transform duration-500 group-hover:translate-x-1"
                  />
                </span>
              </div>
            </a>
          }
        </div>
      </div>
    </section>

    <section aria-label="Mon approche" class="section-chapter bg-white">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <app-scrub-text
          [text]="manifesto"
          class="font-display text-[clamp(1.85rem,3.6vw,3.4rem)] font-semibold leading-[1.2] text-slate-900"
        />
      </div>
    </section>

    @defer (on viewport) {
      <app-reviews [googleReviewsUrl]="googleReviewsUrl" />
    } @placeholder {
      <div class="section-chapter"></div>
    } @error {
      <p class="text-center text-slate-500 section-y">Les témoignages n'ont pas pu être chargés.</p>
    }

    <section
      id="contact"
      aria-labelledby="contact-heading"
      class="bg-warm-mesh grain scroll-mt-24 section-chapter"
    >
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl">
          @if (cta.badge) {
            <p class="mb-6 flex items-center gap-3 text-sm font-semibold text-brand-700">
              <span class="h-px w-10 bg-brand-300" aria-hidden="true"></span>
              {{ cta.badge }}
            </p>
          }
          <h2
            id="contact-heading"
            class="font-display text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-[1.02] text-slate-900"
          >
            {{ cta.title }}
          </h2>
          <p class="mt-6 max-w-2xl text-xl leading-relaxed text-slate-600">{{ cta.subtitle }}</p>
        </div>

        <div class="mt-16 grid gap-4 sm:grid-cols-2">
          @for (option of contactOptions; track option.panel) {
            <button
              type="button"
              (click)="openPanel(option.panel)"
              [attr.aria-expanded]="activePanel() === option.panel"
              aria-controls="contact-panel"
              class="group flex items-start gap-6 rounded-[2rem] p-8 text-left transition-colors duration-500 cursor-pointer max-md:p-6"
              [class]="
                activePanel() === option.panel
                  ? 'bg-brand-700 text-white shadow-xl shadow-brand-900/20'
                  : 'bg-white text-slate-900 ring-1 ring-slate-900/5 hover:ring-brand-300'
              "
            >
              <span
                class="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl"
                [class]="
                  activePanel() === option.panel
                    ? 'bg-white/15 text-white'
                    : 'bg-brand-50 text-brand-700'
                "
                aria-hidden="true"
              >
                <app-icon [name]="option.icon" size="lg" />
              </span>
              <span>
                <span class="block font-display text-2xl font-bold">{{ option.title }}</span>
                <span
                  class="mt-2 block"
                  [class]="activePanel() === option.panel ? 'text-white/80' : 'text-slate-600'"
                  >{{ option.description }}</span
                >
              </span>
            </button>
          }
        </div>

        <div id="contact-panel">
          @if (activePanel() === 'booking') {
            <div class="mx-auto mt-12 max-w-5xl">
              @defer {
                <app-booking />
              } @placeholder {
                <div class="py-10"></div>
              } @error {
                <div class="py-10 text-center">
                  <p class="text-slate-600 mb-3">Le module de réservation n'a pas pu se charger.</p>
                  <button
                    type="button"
                    (click)="retry()"
                    class="text-brand-700 font-medium hover:text-brand-800 cursor-pointer"
                  >
                    Réessayer
                  </button>
                </div>
              }
            </div>
          } @else if (activePanel() === 'contact') {
            <div class="mx-auto mt-12 max-w-2xl">
              @defer {
                <app-contact-form />
              } @placeholder {
                <div class="py-10"></div>
              } @error {
                <div class="py-10 text-center">
                  <p class="text-slate-600 mb-3">Le formulaire n'a pas pu se charger.</p>
                  <button
                    type="button"
                    (click)="retry()"
                    class="text-brand-700 font-medium hover:text-brand-800 cursor-pointer"
                  >
                    Réessayer
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class Home {
  private readonly getSiteSetting = inject(GetSiteSettingUseCase);
  private readonly getAllPages = inject(GetAllPagesUseCase);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly _seo = inject(Seo);

  protected readonly googleReviewsUrl = GOOGLE_REVIEWS_URL;
  protected readonly manifesto = MANIFESTO;

  protected readonly variantClass: Record<BentoVariant, string> = {
    feature: 'bg-brand-800 text-white',
    wide: 'bg-brand-700 text-white',
    soft: 'bg-brand-100 text-slate-900',
    deep: 'bg-brand-950 text-white',
  };
  protected readonly iconClass: Record<BentoVariant, string> = {
    feature: 'bg-white/15 text-white backdrop-blur-sm',
    wide: 'bg-white/15 text-white backdrop-blur-sm',
    soft: 'bg-white text-brand-700',
    deep: 'bg-white/10 text-brand-200',
  };
  protected readonly contactOptions = [
    {
      panel: 'booking',
      icon: 'calendar',
      title: 'Prendre rendez-vous',
      description: 'Choisissez une date et un créneau pour votre séance personnalisée.',
    },
    {
      panel: 'contact',
      icon: 'mail',
      title: 'Me contacter',
      description: 'Une question ? Envoyez-moi un message, je vous réponds rapidement.',
    },
  ] as const;

  protected readonly hero = signal<HeroSettings>(DEFAULT_HERO);
  protected readonly services = signal<HomeServicesSettings>(DEFAULT_HOME_SERVICES);
  protected readonly ctaSettings = signal<HomeCTASettings>(DEFAULT_HOME_CTA);
  protected readonly pages = signal<readonly PageContent[]>([]);
  protected readonly activePanel = signal<'booking' | 'contact' | null>(null);

  protected readonly serviceCardsResolved = computed(() => {
    const pages = this.pages();
    return SERVICE_CARDS.map((card) => {
      const page = pages.find((p) => p.slug === card.slug);
      const title = page?.title ?? DEFAULT_PAGES[card.slug].title;
      const introFull = page?.introduction ?? DEFAULT_PAGES[card.slug].introduction;
      const intro = introFull.length > 120 ? introFull.substring(0, 120) + '...' : introFull;
      const image = page?.imageUrl || DEFAULT_PAGES[card.slug].imageUrl;
      return { ...card, title, intro, introFull, image };
    });
  });

  // Titre de section éditable, ponctué de deux pastilles-images des spécialités (si disponibles).
  protected readonly servicesHeading = computed<readonly HeadingSegment[]>(() => {
    const words = this.services().title.split(/\s+/).filter(Boolean);
    const images = this.serviceCardsResolved()
      .map((c) => c.image)
      .filter(Boolean);
    if (words.length < 4 || images.length === 0) return [{ kind: 'text', text: words.join(' ') }];

    const cuts = [Math.ceil(words.length / 3), Math.ceil((2 * words.length) / 3)];
    const segments: HeadingSegment[] = [];
    let from = 0;
    cuts.forEach((cut, i) => {
      if (i >= images.length) return;
      segments.push({ kind: 'text', text: words.slice(from, cut).join(' ') + ' ' });
      segments.push({ kind: 'pill', src: images[i] });
      from = cut;
    });
    segments.push({ kind: 'text', text: ' ' + words.slice(from).join(' ') });
    return segments;
  });

  constructor() {
    this._seo.update(ROUTE_SEO.home);
    // Fetch côté browser uniquement : le prerender sert le contenu par défaut (stable, SEO),
    // le contenu live est chargé après hydratation.
    afterNextRender(() => {
      this.loadContent();
    });
  }

  private async loadContent(): Promise<void> {
    const [hero, services, cta, pages] = await Promise.all([
      this.getSiteSetting.execute<HeroSettings>('home_hero'),
      this.getSiteSetting.execute<HomeServicesSettings>('home_services'),
      this.getSiteSetting.execute<HomeCTASettings>('home_cta'),
      this.getAllPages.execute(),
    ]);
    this.hero.set(hero ?? DEFAULT_HERO);
    this.services.set(services ?? DEFAULT_HOME_SERVICES);
    this.ctaSettings.set(cta ?? DEFAULT_HOME_CTA);
    this.pages.set(pages);
  }

  protected openPanel(panel: 'booking' | 'contact'): void {
    this.activePanel.set(this.activePanel() === panel ? null : panel);
  }

  protected retry(): void {
    if (isPlatformBrowser(this.platformId)) location.reload();
  }

  protected scrollTo(sectionId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const id = sectionId.replace(/^#/, '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
