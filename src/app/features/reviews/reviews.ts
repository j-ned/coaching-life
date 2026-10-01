import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Icon } from '@shared/components/icon/icon';

type Review = {
  readonly quote: string;
  readonly author: string;
  readonly initial: string;
  readonly service: string;
  readonly rating: number;
};

const REVIEWS: readonly Review[] = [
  {
    quote:
      "Un accompagnement exceptionnel. J'ai pu dépasser mes blocages professionnels en quelques séances. Je recommande vivement !",
    author: 'Sophie L.',
    initial: 'S',
    service: 'Coaching de vie',
    rating: 5,
  },
  {
    quote:
      "L'équicoaching a été une révélation. Comprendre mes émotions à travers la réaction du cheval m'a beaucoup aidé en tant que manager.",
    author: 'Thomas M.',
    initial: 'T',
    service: 'Coaching équin',
    rating: 4,
  },
  {
    quote:
      "Enfin une personne qui comprend vraiment ma réalité de maman d'un enfant TDAH. Un grand soutien sans jugement.",
    author: 'Claire D.',
    initial: 'C',
    service: 'Aide aux parents',
    rating: 5,
  },
];

const STARS = [1, 2, 3, 4, 5] as const;

/** Témoignages : une voix à la fois, défilement uniquement à la demande (pas d'autoplay). */
@Component({
  selector: 'app-reviews',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block section-chapter' },
  template: `
    @let r = current();
    <section
      aria-labelledby="reviews-heading"
      aria-roledescription="carrousel"
      class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
    >
      <div class="grid gap-14 lg:grid-cols-12 lg:gap-20">
        <div class="lg:col-span-4">
          <h2
            id="reviews-heading"
            class="font-display text-[clamp(2rem,3.5vw,3rem)] font-bold leading-[1.08] text-slate-900"
          >
            Ce que disent mes clients
          </h2>

          <div class="mt-10 flex items-center" aria-hidden="true">
            @for (item of reviews; track item.author; let i = $index) {
              <span
                class="-ml-3 first:ml-0 inline-flex size-14 items-center justify-center rounded-full font-display text-lg font-bold ring-4 ring-slate-50 transition-all duration-500"
                [class]="
                  i === index()
                    ? 'bg-brand-700 text-white scale-110 z-10'
                    : 'bg-brand-100 text-brand-800'
                "
                >{{ item.initial }}</span
              >
            }
          </div>

          <div class="mt-10 flex items-center gap-3">
            <button
              type="button"
              (click)="previous()"
              class="inline-flex size-12 items-center justify-center rounded-full bg-white text-slate-800 ring-1 ring-slate-200 transition-colors hover:bg-brand-50 hover:text-brand-800 cursor-pointer"
              aria-label="Témoignage précédent"
            >
              <app-icon name="chevron-left" size="md" />
            </button>
            <button
              type="button"
              (click)="next()"
              class="inline-flex size-12 items-center justify-center rounded-full bg-white text-slate-800 ring-1 ring-slate-200 transition-colors hover:bg-brand-50 hover:text-brand-800 cursor-pointer"
              aria-label="Témoignage suivant"
            >
              <app-icon name="chevron-right" size="md" />
            </button>
            <span class="ml-2 text-sm font-medium tabular-nums text-slate-500"
              >{{ index() + 1 }} / {{ reviews.length }}</span
            >
          </div>
        </div>

        <figure
          class="lg:col-span-8"
          aria-live="polite"
          aria-roledescription="diapositive"
          [attr.aria-label]="index() + 1 + ' sur ' + reviews.length"
        >
          <div
            class="flex gap-1 text-brand-500"
            role="img"
            [attr.aria-label]="r.rating + ' étoiles sur 5'"
          >
            @for (s of stars; track s) {
              <app-icon
                name="star-filled"
                size="md"
                [filled]="true"
                [class.text-brand-100]="s > r.rating"
              />
            }
          </div>
          <blockquote
            class="mt-8 font-display text-[clamp(1.6rem,3vw,2.6rem)] font-semibold leading-[1.25] text-slate-900"
          >
            <p>&laquo;&nbsp;{{ r.quote }}&nbsp;&raquo;</p>
          </blockquote>
          <figcaption class="mt-10 flex items-center gap-4">
            <span class="h-px w-12 bg-brand-300" aria-hidden="true"></span>
            <span>
              <span class="block font-semibold text-slate-900">{{ r.author }}</span>
              <span class="block text-sm text-slate-500">{{ r.service }}</span>
            </span>
          </figcaption>
        </figure>
      </div>

      @if (googleReviewsUrl()) {
        <div class="mt-16 lg:grid lg:grid-cols-12 lg:gap-20">
          <div class="lg:col-span-8 lg:col-start-5">
            <a
              [href]="googleReviewsUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              Voir tous les avis sur Google
              <app-icon name="arrow-right" size="sm" />
            </a>
          </div>
        </div>
      }
    </section>
  `,
})
export class Reviews {
  readonly googleReviewsUrl = input<string>('');

  protected readonly reviews = REVIEWS;
  protected readonly stars = STARS;
  protected readonly index = signal(0);
  protected readonly current = computed(() => this.reviews[this.index()]);

  protected next(): void {
    this.index.update((i) => (i + 1) % this.reviews.length);
  }

  protected previous(): void {
    this.index.update((i) => (i - 1 + this.reviews.length) % this.reviews.length);
  }
}
