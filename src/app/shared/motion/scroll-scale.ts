import { Directive, ElementRef, inject } from '@angular/core';
import { injectScrollMotion } from './scroll-motion';

/**
 * Média qui grandit doucement en entrant dans le viewport, puis s'estompe en sortant par le haut.
 * Poser sur le conteneur `overflow-hidden` d'une image.
 */
@Directive({ selector: '[appScrollScale]' })
export class ScrollScale {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    injectScrollMotion((gsap) => {
      const el = this.el.nativeElement;
      gsap.fromTo(
        el,
        { scale: 0.9 },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 35%', scrub: 0.6 },
        },
      );
      gsap.to(el, {
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'bottom 30%', end: 'bottom top', scrub: 0.6 },
      });
    });
  }
}
