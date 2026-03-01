import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { GetDashboardStatsUseCase } from '../../analytics/domain/use-cases/get-dashboard-stats.use-case';
import { GetWeeklyActivityUseCase } from '../../analytics/domain/use-cases/get-weekly-activity.use-case';
import type { PeriodFilter, WeeklyDataPoint } from '../../analytics/domain/models/analytics.model';
import { COACHING_TYPE_LABELS } from '../../booking/domain/models/appointment.model';
import { MESSAGE_SUBJECT_LABELS } from '../../contact/domain/models/message.model';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { PeriodSelector } from '../../../shared/components/period-selector/period-selector';
import { ActivityChart } from '../../../shared/components/activity-chart/activity-chart';
import { Icon } from '../../../shared/components/icon/icon';

const STATUS_CONFIG: Record<string, { label: string; colorClass: string }> = {
  pending: { label: 'En attente', colorClass: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmés', colorClass: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Annulés', colorClass: 'bg-red-100 text-red-800' },
  completed: { label: 'Terminés', colorClass: 'bg-violet-100 text-violet-800' },
};

const SERVICE_COLOR_CONFIG: Record<string, string> = {
  'life-coaching': 'bg-violet-100 text-violet-800',
  'personal-development': 'bg-amber-100 text-amber-800',
  'equine-coaching': 'bg-emerald-100 text-emerald-800',
  'neuroatypical-parents': 'bg-sky-100 text-sky-800',
  'life_coach': 'bg-violet-100 text-violet-800',
  'dev_personnel': 'bg-amber-100 text-amber-800',
  'equine': 'bg-emerald-100 text-emerald-800',
  'parents': 'bg-sky-100 text-sky-800',
  'other': 'bg-slate-100 text-slate-700',
  '': 'bg-slate-100 text-slate-600',
};

@Component({
  selector: 'app-dashboard-home',
  imports: [StatCard, PeriodSelector, ActivityChart, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <h2 class="text-xl font-medium text-slate-800 mb-6">Vue d'ensemble</h2>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <app-stat-card
        label="Visites (30 jours)"
        [value]="visitsDisplay()"
        icon="trending-up"
        iconBgClass="bg-violet-50 text-violet-500" />
      <app-stat-card
        label="RDV à venir"
        [value]="appointmentsDisplay()"
        icon="calendar"
        iconBgClass="bg-amber-50 text-amber-500" />
      <app-stat-card
        label="Nouveaux Messages"
        [value]="messagesDisplay()"
        icon="mail"
        iconBgClass="bg-teal-50 text-teal-500" />
    </div>

    @if (stats(); as s) {
      <!-- Appointment status breakdown -->
      <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6"
               aria-labelledby="status-heading">
        <h3 id="status-heading" class="text-sm font-medium text-slate-700 mb-4">
          Rendez-vous par statut
        </h3>
        <div class="flex flex-wrap gap-3">
          @for (entry of statusEntries(); track entry.key) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  [class]="entry.colorClass">
              {{ entry.label }}: {{ entry.count }}
            </span>
          }
        </div>
      </section>

      <!-- Appointment service breakdown -->
      <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6"
               aria-labelledby="rdv-service-heading">
        <h3 id="rdv-service-heading" class="text-sm font-medium text-slate-700 mb-4">
          Rendez-vous par service
        </h3>
        <div class="flex flex-wrap gap-3">
          @for (entry of appointmentServiceEntries(); track entry.key) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  [class]="entry.colorClass">
              {{ entry.label }}: {{ entry.count }}
            </span>
          } @empty {
            <p class="text-slate-400 text-sm">Aucun rendez-vous</p>
          }
        </div>
      </section>

      <!-- Message service breakdown -->
      <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8"
               aria-labelledby="msg-service-heading">
        <h3 id="msg-service-heading" class="text-sm font-medium text-slate-700 mb-4">
          Messages par service
        </h3>
        <div class="flex flex-wrap gap-3">
          @for (entry of messageServiceEntries(); track entry.key) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  [class]="entry.colorClass">
              {{ entry.label }}: {{ entry.count }}
            </span>
          } @empty {
            <p class="text-slate-400 text-sm">Aucun message</p>
          }
        </div>
      </section>
    }

    <!-- Weekly activity chart -->
    <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
             aria-labelledby="activity-heading">
      <div class="flex items-center justify-between mb-4">
        <h3 id="activity-heading" class="text-sm font-medium text-slate-700">
          Activité hebdomadaire
        </h3>
        <app-period-selector [(period)]="selectedPeriod" />
      </div>

      @if (weeklyData(); as wd) {
        @if (wd.length > 0) {
          <app-activity-chart [data]="wd" />
        } @else {
          <p class="text-slate-400 text-sm text-center py-12">Aucune donnée pour cette période</p>
        }
      } @else {
        <div class="flex items-center justify-center py-12 text-slate-400">
          <app-icon name="loader" size="lg" />
          <span class="ml-2 text-sm">Chargement...</span>
        </div>
      }
    </section>
  `,
})
export class DashboardHome {
  private readonly getDashboardStats = inject(GetDashboardStatsUseCase);
  private readonly getWeeklyActivity = inject(GetWeeklyActivityUseCase);

  protected readonly selectedPeriod = signal<PeriodFilter>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  protected readonly stats = toSignal(this.getDashboardStats.execute());

  protected readonly visitsDisplay = computed(() => {
    const s = this.stats();
    return s ? s.visitsLast30Days.toLocaleString('fr-FR') : '...';
  });

  protected readonly appointmentsDisplay = computed(() => {
    const s = this.stats();
    return s ? String(s.upcomingAppointments) : '...';
  });

  protected readonly messagesDisplay = computed(() => {
    const s = this.stats();
    return s ? String(s.unreadMessages) : '...';
  });

  protected readonly statusEntries = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return Object.entries(s.appointmentStatusBreakdown).map(([key, count]) => ({
      key,
      count,
      label: STATUS_CONFIG[key]?.label ?? key,
      colorClass: STATUS_CONFIG[key]?.colorClass ?? 'bg-slate-100 text-slate-800',
    }));
  });

  protected readonly appointmentServiceEntries = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return Object.entries(s.appointmentServiceBreakdown).map(([key, count]) => ({
      key,
      count,
      label: COACHING_TYPE_LABELS[key as keyof typeof COACHING_TYPE_LABELS] ?? key,
      colorClass: SERVICE_COLOR_CONFIG[key] ?? 'bg-slate-100 text-slate-700',
    }));
  });

  protected readonly messageServiceEntries = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return Object.entries(s.messageServiceBreakdown).map(([key, count]) => ({
      key,
      count,
      label: MESSAGE_SUBJECT_LABELS[key] ?? key,
      colorClass: SERVICE_COLOR_CONFIG[key] ?? 'bg-slate-100 text-slate-700',
    }));
  });

  protected readonly weeklyData = signal<WeeklyDataPoint[] | null>(null);

  constructor() {
    effect(() => {
      const period = this.selectedPeriod();
      this.weeklyData.set(null);
      this.getWeeklyActivity.execute(period).subscribe(data => {
        this.weeklyData.set(data);
      });
    });
  }
}
