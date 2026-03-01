import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LogoutUseCase } from '../../features/auth/domain/use-cases/logout.use-case';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans' },
  template: `
      <!-- Sidebar -->
      <aside class="w-full md:w-64 bg-slate-900 md:min-h-screen shrink-0 flex flex-col">
        <div class="h-20 flex items-center px-6 border-b border-slate-800">
          <a routerLink="/" class="text-white font-semibold text-xl tracking-tight">Coaching Life Dashboard</a>
        </div>
        <nav class="grow py-6 px-4 space-y-1">
          <a routerLink="/dashboard" routerLinkActive="bg-brand-500 text-white" [routerLinkActiveOptions]="{exact: true}"
             class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <app-icon name="trending-up" size="md" />
            Statistiques
          </a>
          <a routerLink="/dashboard/appointments" routerLinkActive="bg-brand-500 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <app-icon name="calendar" size="md" />
            Rendez-vous
          </a>
          <a routerLink="/dashboard/messages" routerLinkActive="bg-brand-500 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <app-icon name="mail" size="md" />
            Messages
          </a>
          <a routerLink="/dashboard/content" routerLinkActive="bg-brand-500 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <app-icon name="pencil" size="md" />
            Contenu
          </a>
        </nav>
        <div class="p-4 border-t border-slate-800 space-y-1">
          <a routerLink="/" class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors">
            <app-icon name="home" size="md" />
            Retour au site
          </a>
          <button (click)="logout()" class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
            <app-icon name="log-out" size="md" />
            Déconnexion
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="grow flex flex-col min-h-screen">
        <header class="bg-white h-20 border-b border-slate-200 flex items-center px-8 shadow-sm justify-between">
          <h1 class="text-2xl font-semibold text-slate-800">Tableau de bord</h1>
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
              CL
            </div>
          </div>
        </header>
        <div class="p-8 grow overflow-auto">
          <router-outlet></router-outlet>
        </div>
      </main>
  `
})
export class DashboardLayout {
  private readonly logoutUseCase = inject(LogoutUseCase);
  private readonly router = inject(Router);

  protected logout(): void {
    this.logoutUseCase.execute().subscribe(() => {
      this.router.navigate(['/']);
    });
  }
}
