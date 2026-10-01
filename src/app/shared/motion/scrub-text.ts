import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { injectScrollMotion } from './scroll-motion';

/**
 * Paragraphe dont les mots s'allument un à un au fil du scroll.
 * Le texte complet reste lisible par les lecteurs d'écran (copie sr-only) et sans JS / sous reduced-motion.
 */
@Component({
  selector: 'app-scrub-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <p class="text-balance">
      <span class="sr-only">{{ text() }}</span>
      <span aria-hidden="true">
        @for (word of words(); track $index) {
          <span class="scrub-word">{{ word }}</span
          >{{ ' ' }}
        }
      </span>
    </p>
  `,
})
export class ScrubText {
  readonly text = input.required<string>();

  protected readonly words = computed(() => this.text().split(/\s+/).filter(Boolean));

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    injectScrollMotion((gsap) => {
      const host = this.el.nativeElement;
      gsap.fromTo(
        host.querySelectorAll('.scrub-word'),
        { opacity: 0.12 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.08,
          scrollTrigger: { trigger: host, start: 'top 80%', end: 'bottom 45%', scrub: 0.5 },
        },
      );
    });
  }
}
