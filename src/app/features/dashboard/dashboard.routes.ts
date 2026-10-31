import { Routes } from '@angular/router';
import { provideCharts } from 'ng2-charts';
import { BarController, BarElement, CategoryScale, Legend, LinearScale, Tooltip } from 'chart.js';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    // Chart.js limité au graphique en barres du tableau de bord, hors bundle du site public.
    providers: [
      provideCharts({
        registerables: [BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip],
      }),
    ],
    loadComponent: () =>
      import('../../layout/dashboard-layout/dashboard-layout').then((m) => m.DashboardLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard-home/dashboard-home').then((m) => m.DashboardHome),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./dashboard-appointments/dashboard-appointments').then(
            (m) => m.DashboardAppointments,
          ),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./dashboard-messages/dashboard-messages').then((m) => m.DashboardMessages),
      },
      {
        path: 'content',
        loadComponent: () =>
          import('./dashboard-content/dashboard-content').then((m) => m.DashboardContent),
      },
      {
        path: 'content/home',
        loadComponent: () =>
          import('./dashboard-content-home/dashboard-content-home').then(
            (m) => m.DashboardContentHome,
          ),
      },
      {
        path: 'content/:slug',
        loadComponent: () =>
          import('./dashboard-content-edit/dashboard-content-edit').then(
            (m) => m.DashboardContentEdit,
          ),
      },
    ],
  },
];
