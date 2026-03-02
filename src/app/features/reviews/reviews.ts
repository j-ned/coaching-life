import {
  ChangeDetectionStrategy,
  Component,
  viewChild,
  ElementRef,
  afterNextRender,
  PLATFORM_ID,
  inject,
  OnDestroy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-reviews',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block py-16 max-md:py-10 bg-slate-50' },
  template: `
    <section aria-labelledby="reviews-heading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2
        id="reviews-heading"
        class="text-3xl font-bold text-center text-slate-800 mb-12 max-md:mb-8 max-md:text-2xl"
      >
        Ce que disent mes clients
      </h2>

      <div
        #reviewsCarousel
        class="grid grid-cols-1 md:grid-cols-3 gap-8 max-md:flex max-md:flex-row-reverse max-md:overflow-x-auto max-md:snap-x max-md:snap-mandatory max-md:pb-6 max-md:-mx-4 max-md:px-4 max-md:scroll-smooth max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
      >
        <!-- Review Card 1 -->
        <article
          class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow max-md:min-w-[85vw] max-md:snap-center"
        >
          <div class="text-brand-400 mb-4 flex">
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
          </div>
          <p class="text-slate-600 mb-6 italic">
            "Un accompagnement exceptionnel. J'ai pu dépasser mes blocages professionnels en
            quelques séances. Je recommande vivement !"
          </p>
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-semibold"
            >
              S
            </div>
            <div>
              <h4 class="font-semibold text-slate-800">Sophie L.</h4>
              <p class="text-sm text-slate-500">Coaching de Vie</p>
            </div>
          </div>
        </article>

        <!-- Review Card 2 -->
        <article
          class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow max-md:min-w-[85vw] max-md:snap-center"
        >
          <div class="text-brand-400 mb-4 flex">
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" class="text-slate-200" />
          </div>
          <p class="text-slate-600 mb-6 italic">
            "L'équicoaching a été une révélation. Comprendre mes émotions à travers la réaction du
            cheval m'a beaucoup aidé en tant que manager."
          </p>
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-semibold"
            >
              T
            </div>
            <div>
              <h4 class="font-semibold text-slate-800">Thomas M.</h4>
              <p class="text-sm text-slate-500">Coaching Equin</p>
            </div>
          </div>
        </article>

        <!-- Review Card 3 -->
        <article
          class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow max-md:min-w-[85vw] max-md:snap-center"
        >
          <div class="text-brand-400 mb-4 flex">
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
          </div>
          <p class="text-slate-600 mb-6 italic">
            "Enfin une personne qui comprend vraiment ma réalité de maman d'un enfant TDAH. Un grand
            soutien sans jugement."
          </p>
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-semibold"
            >
              C
            </div>
            <div>
              <h4 class="font-semibold text-slate-800">Claire D.</h4>
              <p class="text-sm text-slate-500">Aide Parents</p>
            </div>
          </div>
        </article>
      </div>

      <div class="mt-12 text-center">
        <a
          href="https://g.page/r/your-google-business-link"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 text-brand-700 font-medium hover:text-brand-800 transition-colors"
        >
          Voir tous les avis sur Google
          <app-icon name="arrow-right" size="sm" />
        </a>
      </div>
    </section>
    <!-- Removed wrapper div -->
  `,
})
export class Reviews implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly reviewsCarouselRef = viewChild<ElementRef<HTMLDivElement>>('reviewsCarousel');
  private destroyAutoScroll?: () => void;

  constructor() {
    afterNextRender({
      read: () => {
        this.setupAutoScroll();
      },
    });
  }

  private setupAutoScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Check if on mobile (md breakpoint is 768px in Tailwind)
    if (window.innerWidth >= 768) return;

    const container = this.reviewsCarouselRef()?.nativeElement;
    if (!container) return;

    let isHoveredOrTouched = false;

    const pause = () => (isHoveredOrTouched = true);
    const resume = () => (isHoveredOrTouched = false);

    container.addEventListener('mouseenter', pause);
    container.addEventListener('mouseleave', resume);
    container.addEventListener('touchstart', pause, { passive: true });
    container.addEventListener('touchend', resume);

    // Initial scroll position for row-reverse (RTL layout) depends on browser behavior.
    // In many modern browsers, scrollLeft is 0 or negative for flex-row-reverse.
    // It is simpler to just scroll horizontally by manipulating coordinates.

    let scrollDirection = -1; // Scroll leftwards by default

    const intervalId = setInterval(() => {
      if (isHoveredOrTouched) return;

      const scrollAmount = (window.innerWidth * 0.85 + 20) * scrollDirection;
      const startLeft = container.scrollLeft;

      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });

      // If we attempt to scroll and the scrollLeft doesn't change, we've hit a boundary
      setTimeout(() => {
        if (container.scrollLeft === startLeft) {
          // Reached the end (leftmost or rightmost), reset to the other side
          if (scrollDirection === -1) {
            container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
          } else {
            container.scrollTo({ left: -container.scrollWidth, behavior: 'smooth' }); // Catch-all for varied browser implementations
          }
        }
      }, 500); // Wait for smooth scroll to finish
    }, 2500); // Scroll every 2.5 seconds

    this.destroyAutoScroll = () => {
      clearInterval(intervalId);
      container.removeEventListener('mouseenter', pause);
      container.removeEventListener('mouseleave', resume);
      container.removeEventListener('touchstart', pause);
      container.removeEventListener('touchend', resume);
    };
  }

  ngOnDestroy(): void {
    if (this.destroyAutoScroll) {
      this.destroyAutoScroll();
    }
  }
}
