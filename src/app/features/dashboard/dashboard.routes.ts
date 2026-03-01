import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
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
