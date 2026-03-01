import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayout } from './layout/main-layout/main-layout';
import { Home } from './pages/home/home';

export const routes: Routes = [
  {
    path: 'dashboard',
    canMatch: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        component: Home,
      },
      {
        path: 'life-coach',
        loadComponent: () => import('./pages/life-coach/life-coach').then((m) => m.LifeCoach),
      },
      {
        path: 'personal-development',
        loadComponent: () =>
          import('./pages/personal-development/personal-development').then(
            (m) => m.PersonalDevelopment,
          ),
      },
      {
        path: 'equine-coaching',
        loadComponent: () =>
          import('./pages/equine-coaching/equine-coaching').then((m) => m.EquineCoaching),
      },
      {
        path: 'neuroatypical-parents',
        loadComponent: () =>
          import('./pages/neuroatypical-parents/neuroatypical-parents').then(
            (m) => m.NeuroatypicalParents,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
