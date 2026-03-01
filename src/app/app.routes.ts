import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layout/dashboard-layout/dashboard-layout').then((m) => m.DashboardLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard-home/dashboard-home').then((m) => m.DashboardHome),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/dashboard/dashboard-appointments/dashboard-appointments').then(
            (m) => m.DashboardAppointments,
          ),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/dashboard/dashboard-messages/dashboard-messages').then(
            (m) => m.DashboardMessages,
          ),
      },
      {
        path: 'content',
        loadComponent: () =>
          import('./features/dashboard/dashboard-content/dashboard-content').then(
            (m) => m.DashboardContent,
          ),
      },
      {
        path: 'content/home',
        loadComponent: () =>
          import('./features/dashboard/dashboard-content-home/dashboard-content-home').then(
            (m) => m.DashboardContentHome,
          ),
      },
      {
        path: 'content/:slug',
        loadComponent: () =>
          import('./features/dashboard/dashboard-content-edit/dashboard-content-edit').then(
            (m) => m.DashboardContentEdit,
          ),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/home').then((m) => m.Home),
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
