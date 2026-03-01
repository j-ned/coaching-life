import {
  ChangeDetectionStrategy,
  Component,
  inject,
  PLATFORM_ID,
  signal,
  HostListener,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthGateway } from '../../features/auth/domain/gateways/auth.gateway';
import { filter, map } from 'rxjs';
import { Login } from '../../features/auth/pages/login/login';
import { TrackPageVisitUseCase } from '../../features/analytics/domain/use-cases/track-page-visit.use-case';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, Login],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'min-h-screen flex flex-col font-sans' },
  template: `
    <header
      class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <a
            routerLink="/"
            (click)="goToTop()"
            class="flex justify-center items-center gap-2 group"
          >
            <!-- Inline SVG for Logo or Brand mark -->
            <div class="text-brand-500 transition-transform group-hover:scale-105">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                ></path>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </div>
            <span class="font-semibold text-xl tracking-tight text-slate-800">COACHING LIFE</span>
          </a>
        </div>

        <nav class="hidden md:flex gap-8">
          <a
            routerLink="/life-coach"
            class="text-slate-600 hover:text-brand-500 font-medium transition-colors"
            >Coach de Vie</a
          >
          <a
            routerLink="/personal-development"
            class="text-slate-600 hover:text-brand-500 font-medium transition-colors"
            >Dev. Personnel</a
          >
          <a
            routerLink="/equine-coaching"
            class="text-slate-600 hover:text-brand-500 font-medium transition-colors"
            >Coaching Equin</a
          >
          <a
            routerLink="/neuroatypical-parents"
            class="text-slate-600 hover:text-brand-500 font-medium transition-colors"
            >Parents Neuroatypiques</a
          >
          @if (isAuthenticated()) {
            <a
              routerLink="/dashboard"
              class="text-brand-600 hover:text-brand-700 font-bold transition-colors"
              >Dashboard</a
            >
          }
        </nav>

        <div class="hidden md:flex items-center">
          <button
            type="button"
            (click)="goToContact()"
            class="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 transform hover:-translate-y-0.5 cursor-pointer"
          >
            Contact
          </button>
        </div>
      </div>
    </header>

    <main class="grow">
      <router-outlet></router-outlet>
    </main>

    <footer class="bg-slate-900 text-slate-300 py-12 mt-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <span class="text-white text-xl font-semibold mb-4 block">COACHING LIFE</span>
          <p class="text-slate-400">
            Accompagnement personnalisé pour révéler votre plein potentiel.
          </p>
        </div>
        <div>
          <h3 class="text-white font-medium mb-4">Spécialités</h3>
          <ul class="space-y-2">
            <li>
              <a routerLink="/life-coach" class="hover:text-brand-400 transition-colors"
                >Coach de Vie Certifié</a
              >
            </li>
            <li>
              <a routerLink="/personal-development" class="hover:text-brand-400 transition-colors"
                >Développement Personnel</a
              >
            </li>
            <li>
              <a routerLink="/equine-coaching" class="hover:text-brand-400 transition-colors"
                >Coaching facilité avec le cheval</a
              >
            </li>
            <li>
              <a routerLink="/neuroatypical-parents" class="hover:text-brand-400 transition-colors"
                >Parents d'enfants neuroatypiques</a
              >
            </li>
          </ul>
        </div>
        <div>
          <h3 class="text-white font-medium mb-4">Contact</h3>
          <p class="text-slate-400 mb-2">Email: contact&#64;coaching-life.com</p>
          <p class="text-slate-400">Téléphone: +33 0 00 00 00 00</p>
        </div>
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

  protected readonly currentYear = new Date().getFullYear();
  protected readonly showLogin = signal(false);

  protected readonly isAuthenticated = toSignal(
    this.authGateway.authStateChanges().pipe(map((state) => state === 'authenticated')),
    { initialValue: false },
  );

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

  @HostListener('window:keydown.control.l', ['$event'])
  onCtrlL(event: Event) {
    event.preventDefault();
    this.showLogin.update((v) => !v);
  }
}
