import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthGateway } from '@features/auth/domain/gateways/auth.gateway';
import { filter, map } from 'rxjs';
import { Login } from '@features/auth/pages/login/login';
import { Icon } from '@shared/components/icon/icon';
import { TrackPageVisitUseCase } from '@features/analytics/domain/use-cases/track-page-visit.use-case';

const NAV_LINKS = [
  { route: '/life-coach', short: 'Coach de vie', label: 'Coach de vie certifiée' },
  { route: '/personal-development', short: 'Développement', label: 'Développement personnel' },
  { route: '/equine-coaching', short: 'Coaching équin', label: 'Coaching avec le cheval' },
  {
    route: '/neuroatypical-parents',
    short: 'Parents',
    label: "Parents d'enfants neuroatypiques",
  },
] as const;

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Login, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'min-h-screen flex flex-col font-sans',
    '(window:keydown.control.l)': 'toggleLogin($event)',
  },
  template: `
    <aside
      data-testid="demo-banner"
      aria-label="Site de démonstration"
      class="flex flex-wrap items-center justify-center gap-x-4 px-4 py-1 text-center text-sm text-brand-50 bg-brand-950"
    >
      <p class="py-2">
        <strong class="font-semibold text-white">Site de démonstration.</strong>
        Coaching Life est une activité fictive, ses coordonnées et témoignages aussi.
      </p>
      <a
        data-testid="demo-banner-link"
        href="https://nedellec-julien.fr/offres/site-vitrine"
        class="inline-flex min-h-11 items-center gap-1.5 rounded-sm font-semibold text-white underline decoration-brand-300 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Le même pour votre activité
        <app-icon name="arrow-right" size="sm" />
      </a>
    </aside>

    <!-- marge négative = hauteur du header : le contenu passe dessous, le padding des heros reste valable -->
    <header class="sticky top-0 z-50 -mb-19 px-3 pt-3 sm:-mb-20 sm:px-6 sm:pt-4">
      <div
        class="mx-auto max-w-6xl rounded-full bg-white/75 backdrop-blur-xl ring-1 ring-slate-900/5 shadow-[0_8px_30px_-12px_rgba(76,29,24,0.18)]"
      >
        <div class="flex h-16 items-center justify-between gap-4 pl-6 pr-2">
          <a
            routerLink="/"
            (click)="goToTop(); closeMobileMenu()"
            class="group flex items-baseline gap-1 font-display text-xl font-bold tracking-tight text-slate-900"
            aria-label="Coaching Life, accueil"
          >
            Coaching<span class="text-brand-700">Life</span>
            <span
              class="size-1.5 rounded-full bg-brand-500 transition-transform duration-500 group-hover:scale-150"
              aria-hidden="true"
            ></span>
          </a>

          <nav class="hidden lg:flex items-center gap-1" aria-label="Navigation principale">
            @for (link of navLinks; track link.route) {
              <a
                [routerLink]="link.route"
                routerLinkActive="bg-brand-50 text-brand-800"
                ariaCurrentWhenActive="page"
                class="rounded-full px-4 py-2 text-[0.95rem] font-medium text-slate-600 transition-colors hover:text-brand-800"
                >{{ link.short }}</a
              >
            }
            @if (isAuthenticated()) {
              <a
                routerLink="/dashboard"
                class="rounded-full px-4 py-2 text-[0.95rem] font-semibold text-brand-700 transition-colors hover:text-brand-800"
                >Dashboard</a
              >
            }
          </nav>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="goToContact()"
              class="hidden sm:inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-colors hover:bg-brand-800 cursor-pointer"
            >
              Prendre rendez-vous
              <app-icon name="arrow-right" size="sm" />
            </button>

            <button
              type="button"
              (click)="toggleMobileMenu()"
              class="lg:hidden inline-flex size-12 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
              [attr.aria-expanded]="isMobileMenuOpen()"
              aria-controls="mobile-menu"
              aria-label="Menu de navigation"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                @if (isMobileMenuOpen()) {
                  <path d="M18 6L6 18M6 6l12 12"></path>
                } @else {
                  <path d="M4 8h16M4 16h16"></path>
                }
              </svg>
            </button>
          </div>
        </div>
      </div>

      @if (isMobileMenuOpen()) {
        <div
          id="mobile-menu"
          class="lg:hidden absolute inset-x-3 top-full mx-auto mt-2 max-w-6xl rounded-3xl sm:inset-x-6 bg-white/95 p-3 backdrop-blur-xl ring-1 ring-slate-900/5 shadow-xl"
        >
          <nav aria-label="Navigation mobile">
            @for (link of navLinks; track link.route) {
              <a
                [routerLink]="link.route"
                routerLinkActive="bg-brand-50 text-brand-800"
                ariaCurrentWhenActive="page"
                (click)="closeMobileMenu()"
                class="block rounded-2xl px-4 py-3.5 font-display text-lg font-semibold text-slate-800 transition-colors hover:bg-brand-50"
                >{{ link.label }}</a
              >
            }
            @if (isAuthenticated()) {
              <a
                routerLink="/dashboard"
                (click)="closeMobileMenu()"
                class="block rounded-2xl px-4 py-3.5 font-display text-lg font-semibold text-brand-700 hover:bg-brand-50"
                >Dashboard</a
              >
            }
          </nav>
          <button
            type="button"
            (click)="closeMobileMenu(); goToContact()"
            class="mt-2 w-full rounded-2xl bg-brand-700 px-5 py-4 font-semibold text-white transition-colors hover:bg-brand-800 cursor-pointer"
          >
            Prendre rendez-vous
          </button>
        </div>
      }
    </header>

    <main class="grow overflow-x-clip">
      <router-outlet></router-outlet>
    </main>

    <footer class="grain relative overflow-hidden bg-brand-950 text-brand-100/80">
      @if (!isHome()) {
        <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-28 md:pt-40">
          <h2
            class="max-w-4xl font-display text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-[1.02] text-white"
          >
            Et si on commençait <span class="text-brand-300">par en parler&nbsp;?</span>
          </h2>
          <p class="mt-6 max-w-xl text-lg text-brand-100/70">
            Un premier échange, sans engagement, pour faire le point sur ce que vous traversez.
          </p>
          <button
            type="button"
            (click)="goToContact()"
            class="mt-10 inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 font-semibold text-brand-950 transition-colors hover:bg-brand-100 cursor-pointer"
          >
            Prendre rendez-vous
            <app-icon name="arrow-right" size="sm" />
          </button>
        </div>
      }

      <div
        class="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 pb-10 pt-24 sm:px-6 md:grid-cols-12 lg:px-8"
      >
        <div class="md:col-span-5">
          <span class="font-display text-2xl font-bold text-white"
            >Coaching<span class="text-brand-300">Life</span></span
          >
          <p class="mt-4 max-w-sm text-brand-200/70">
            Accompagnement personnalisé pour révéler votre plein potentiel.
          </p>
        </div>
        <nav aria-label="Spécialités" class="md:col-span-4">
          <h3 class="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-brand-300">
            Spécialités
          </h3>
          <ul class="space-y-3">
            @for (link of navLinks; track link.route) {
              <li>
                <a [routerLink]="link.route" class="transition-colors hover:text-white">{{
                  link.label
                }}</a>
              </li>
            }
          </ul>
        </nav>
        <div class="md:col-span-3">
          <h3 class="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-brand-300">
            Contact
          </h3>
          <p class="mb-2">
            <a
              href="mailto:contact&#64;nedellec-julien.fr"
              class="transition-colors hover:text-white"
              >contact&#64;nedellec-julien.fr</a
            >
          </p>
          <p class="text-brand-200/70">+33 0 00 00 00 00</p>
        </div>
      </div>

      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p
          class="select-none border-t border-white/10 pt-6 whitespace-nowrap font-display text-[clamp(2.75rem,11.5vw,10.5rem)] font-bold leading-[0.85] tracking-tight text-brand-900/70"
          aria-hidden="true"
        >
          Coaching Life
        </p>
      </div>
    </footer>

    @if (showLogin()) {
      <app-login (closed)="showLogin.set(false)" />
    }
  `,
})
export class MainLayout {
  private readonly authGateway = inject(AuthGateway);
  private readonly router = inject(Router);
  private readonly trackPageVisit = inject(TrackPageVisitUseCase);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly navLinks = NAV_LINKS;
  protected readonly showLogin = signal(false);
  protected readonly isMobileMenuOpen = signal(false);

  protected toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  protected readonly isAuthenticated = toSignal(
    this.authGateway.authStateChanges().pipe(map((state) => state === 'authenticated')),
    { initialValue: false },
  );

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split(/[?#]/)[0]),
    ),
    { initialValue: this.router.url.split(/[?#]/)[0] },
  );
  protected readonly isHome = computed(() => this.currentPath() === '/');

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        filter(() => isPlatformBrowser(this.platformId)),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.trackPageVisit.execute(
          e.urlAfterRedirects,
          document.referrer ?? '',
          navigator.userAgent ?? '',
        );
      });
  }

  protected goToTop(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected goToContact(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    if (currentUrl === '/' || currentUrl === '') {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      this.router.navigate(['/'], { fragment: 'contact' });
    }
  }

  protected toggleLogin(event: Event): void {
    event.preventDefault();
    this.showLogin.update((v) => !v);
  }
}
