import { afterNextRender, DestroyRef, inject } from '@angular/core';

type Gsap = typeof import('gsap').gsap;

let gsapPromise: Promise<Gsap> | null = null;

// GSAP + ScrollTrigger chargés à la demande, côté navigateur uniquement (jamais au module load : SSR-safe).
function loadGsap(): Promise<Gsap> {
  gsapPromise ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
    ([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger);
      // Le contenu live arrive après hydratation et décale la mise en page : on recalcule les déclencheurs.
      let timer: ReturnType<typeof setTimeout> | undefined;
      new ResizeObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => ScrollTrigger.refresh(), 150);
      }).observe(document.body);
      return gsap;
    },
  );
  return gsapPromise;
}

/**
 * Pose une animation au scroll après le premier rendu navigateur.
 * Désactivée sous `prefers-reduced-motion: reduce` (public potentiellement neuroatypique) :
 * l'élément reste alors dans son état final, statique.
 * À appeler dans un contexte d'injection.
 */
export function injectScrollMotion(setup: (gsap: Gsap) => void): void {
  const destroyRef = inject(DestroyRef);
  let revert: (() => void) | undefined;
  let destroyed = false;

  destroyRef.onDestroy(() => {
    destroyed = true;
    revert?.();
  });

  afterNextRender(() => {
    loadGsap().then((gsap) => {
      if (destroyed) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => setup(gsap));
      revert = () => mm.revert();
    });
  });
}
