import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { Icon } from '@shared/components/icon/icon';
import type {
  Appointment,
  AppointmentStatus,
  DisabledDate,
} from '../../booking/domain/models/appointment.model';
import { COACHING_TYPE_LABELS } from '../../booking/domain/models/appointment.model';
import { GetAllAppointmentsUseCase } from '../../booking/domain/use-cases/get-all-appointments.use-case';
import { GetDisabledDatesUseCase } from '../../booking/domain/use-cases/get-disabled-dates.use-case';
import { UpdateAppointmentStatusUseCase } from '../../booking/domain/use-cases/update-appointment-status.use-case';
import { DeleteAppointmentUseCase } from '../../booking/domain/use-cases/delete-appointment.use-case';
import { AddDisabledDateUseCase } from '../../booking/domain/use-cases/add-disabled-date.use-case';
import { RemoveDisabledDateUseCase } from '../../booking/domain/use-cases/remove-disabled-date.use-case';
import { getFrenchHolidays, getUnavailableReason } from '@shared/calendar/french-holidays';

type Tab = 'appointments' | 'availability';

type CalendarDay = {
  readonly date: string;
  readonly dayNumber: number;
  readonly isCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly isDisabled: boolean;
  readonly reason?: string;
  readonly isAutoBlocked: boolean;
  readonly autoBlockedReason?: string;
  readonly isSelected: boolean;
  readonly cssClass: string;
  readonly ariaLabel: string;
};

type AppointmentRow = {
  readonly appointment: Appointment;
  readonly coachingLabel: string;
  readonly dateTime: string;
  readonly statusClass: string;
  readonly statusLabel: string;
};

type DisabledDateRow = {
  readonly disabledDate: DisabledDate;
  readonly dateLabel: string;
};

@Component({
  selector: 'app-dashboard-appointments',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-medium text-slate-800">Rendez-vous & Disponibilités</h2>
    </div>

    <!-- Tabs -->
    <nav class="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit" aria-label="Onglets rendez-vous">
      <button
        data-testid="tab-appointments"
        (click)="activeTab.set('appointments')"
        [class]="
          activeTab() === 'appointments'
            ? 'px-4 py-2 rounded-md text-sm font-medium bg-white text-slate-800 shadow-sm transition-all'
            : 'px-4 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700 transition-all'
        "
      >
        Rendez-vous ({{ appointments().length }})
      </button>
      <button
        data-testid="tab-availability"
        (click)="activeTab.set('availability')"
        [class]="
          activeTab() === 'availability'
            ? 'px-4 py-2 rounded-md text-sm font-medium bg-white text-slate-800 shadow-sm transition-all'
            : 'px-4 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700 transition-all'
        "
      >
        Disponibilités
      </button>
    </nav>

    <!-- ═══ TAB: Rendez-vous ═══ -->
    @if (activeTab() === 'appointments') {
      @if (loadError()) {
        <div class="mb-4 rounded-xl bg-red-50 border border-red-100 p-4" role="alert">
          <p class="text-sm text-red-700">{{ loadError() }}</p>
          <button
            (click)="loadAppointments()"
            class="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
          >
            Réessayer
          </button>
        </div>
      }
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr
                class="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500"
              >
                <th class="p-4 font-medium">Client</th>
                <th class="p-4 font-medium">Service</th>
                <th class="p-4 font-medium">Date & Heure</th>
                <th class="p-4 font-medium">Statut</th>
                <th class="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (row of appointmentRows(); track row.appointment.id) {
                @let appt = row.appointment;
                <tr class="hover:bg-slate-50/50 transition-colors" data-testid="appointment-row">
                  <td class="p-4">
                    <p class="font-medium text-slate-800">{{ appt.clientName }}</p>
                    <p class="text-xs text-slate-500">{{ appt.clientEmail }}</p>
                  </td>
                  <td class="p-4 text-slate-600">{{ row.coachingLabel }}</td>
                  <td class="p-4 text-slate-600">{{ row.dateTime }}</td>
                  <td class="p-4">
                    <span
                      class="px-2.5 py-1 rounded-full text-xs font-medium"
                      [class]="row.statusClass"
                    >
                      {{ row.statusLabel }}
                    </span>
                  </td>
                  <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      @if (appt.status === 'pending') {
                        <button
                          data-testid="appointment-confirm"
                          (click)="updateStatus(appt.id, 'confirmed')"
                          class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          Confirmer
                        </button>
                        <button
                          data-testid="appointment-cancel"
                          (click)="updateStatus(appt.id, 'cancelled')"
                          class="px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                        >
                          Annuler
                        </button>
                      }
                      @if (appt.status === 'confirmed') {
                        <button
                          data-testid="appointment-complete"
                          (click)="updateStatus(appt.id, 'completed')"
                          class="px-3 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          Terminé
                        </button>
                        <button
                          data-testid="appointment-cancel"
                          (click)="updateStatus(appt.id, 'cancelled')"
                          class="px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                        >
                          Annuler
                        </button>
                      }
                      @if (confirmDeleteId() === appt.id) {
                        <button
                          data-testid="appointment-delete-confirm"
                          (click)="deleteAppointment(appt.id)"
                          class="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          Confirmer la suppression
                        </button>
                        <button
                          (click)="confirmDeleteId.set(null)"
                          class="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          Annuler
                        </button>
                      } @else {
                        <button
                          data-testid="appointment-delete"
                          (click)="confirmDeleteId.set(appt.id)"
                          class="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Supprimer
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="p-8 text-center text-slate-500">Aucun rendez-vous.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- ═══ TAB: Disponibilités ═══ -->
    @if (activeTab() === 'availability') {
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Calendrier -->
        <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div class="flex items-center justify-between mb-6">
            <button
              (click)="previousMonth()"
              class="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center hover:border-brand-300 hover:text-brand-700 transition-colors"
              aria-label="Mois précédent"
            >
              <app-icon name="chevron-left" size="md" />
            </button>
            <h3 class="text-lg font-bold text-slate-800 capitalize">{{ monthLabel() }}</h3>
            <button
              (click)="nextMonth()"
              class="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center hover:border-brand-300 hover:text-brand-700 transition-colors"
              aria-label="Mois suivant"
            >
              <app-icon name="chevron-right" size="md" />
            </button>
          </div>

          <div class="grid grid-cols-7 gap-1 mb-2">
            @for (day of weekDays; track day) {
              <div class="text-center text-xs font-medium text-slate-500 py-2">{{ day }}</div>
            }
          </div>

          <div
            class="grid grid-cols-7 gap-1"
            role="grid"
            aria-label="Calendrier de gestion des disponibilités"
          >
            @for (day of daysGrid(); track day.date) {
              @if (day.isCurrentMonth) {
                <button
                  data-testid="availability-day"
                  (click)="toggleDate(day)"
                  [class]="day.cssClass"
                  [attr.aria-label]="day.ariaLabel"
                  [attr.aria-pressed]="day.isSelected"
                >
                  <span aria-hidden="true">{{ day.dayNumber }}</span>
                  @if (day.isDisabled) {
                    <span
                      class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-400"
                      aria-hidden="true"
                    ></span>
                  } @else if (day.isAutoBlocked) {
                    <span
                      class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400"
                      aria-hidden="true"
                    ></span>
                  }
                </button>
              } @else {
                <div class="h-12" aria-hidden="true"></div>
              }
            }
          </div>

          <div class="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-3 h-3 rounded bg-slate-50 border border-slate-200"></span>
              Disponible
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-3 h-3 rounded bg-red-50 border border-red-200"></span>
              Désactivé
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-3 h-3 rounded bg-amber-50 border border-amber-200"></span>
              Weekend / Férié
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-3 h-3 rounded bg-brand-50 border border-brand-200"></span>
              Aujourd'hui
            </div>
          </div>
        </div>

        <!-- Panneau latéral -->
        <div class="space-y-6">
          @if (selectedDate()) {
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h4 class="text-sm font-semibold text-slate-800 mb-3">
                {{ selectedDateLabel() }}
              </h4>

              @if (isSelectedDisabled()) {
                <p class="text-sm text-red-600 mb-2">Cette date est désactivée</p>
                @if (selectedReason()) {
                  <p class="text-xs text-slate-500 mb-4">Raison : {{ selectedReason() }}</p>
                }
                <button
                  data-testid="enable-date"
                  (click)="enableDate()"
                  class="w-full px-4 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-100 transition-colors"
                >
                  Réactiver cette date
                </button>
              } @else {
                <div class="space-y-3">
                  <div>
                    <label for="reason" class="block text-xs font-medium text-slate-500 mb-1.5">
                      Raison (optionnel)
                    </label>
                    <input
                      #reasonInputEl
                      id="reason"
                      type="text"
                      [value]="reasonInput()"
                      (input)="reasonInput.set(reasonInputEl.value)"
                      class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:border-brand-500 focus:outline-none transition-colors"
                      placeholder="Congé, formation..."
                    />
                  </div>
                  <button
                    data-testid="disable-date"
                    (click)="disableDate()"
                    class="w-full px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Désactiver cette date
                  </button>
                </div>
              }
            </div>
          } @else {
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <p class="text-sm text-slate-500 text-center">
                Cliquez sur une date pour la désactiver ou la réactiver
              </p>
            </div>
          }

          <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h4 class="text-sm font-semibold text-slate-800 mb-3">
              Dates désactivées ({{ disabledDates().length }})
            </h4>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              @for (row of disabledDateRows(); track row.disabledDate.id) {
                @let dd = row.disabledDate;
                <div
                  class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100"
                  data-testid="disabled-date-row"
                >
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-slate-700">{{ row.dateLabel }}</p>
                    @if (dd.reason) {
                      <p class="text-xs text-slate-500 truncate">{{ dd.reason }}</p>
                    }
                  </div>
                  <button
                    data-testid="disabled-date-remove"
                    (click)="removeDate(dd)"
                    class="shrink-0 text-red-400 hover:text-red-600 transition-colors"
                    aria-label="Supprimer"
                  >
                    <app-icon name="x" size="sm" />
                  </button>
                </div>
              } @empty {
                <p class="text-xs text-slate-500 text-center py-4">Aucune date désactivée</p>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardAppointments {
  private readonly getAllAppointments = inject(GetAllAppointmentsUseCase);
  private readonly getDisabledDatesUseCase = inject(GetDisabledDatesUseCase);
  private readonly updateAppointmentStatus = inject(UpdateAppointmentStatusUseCase);
  private readonly deleteAppointmentUseCase = inject(DeleteAppointmentUseCase);
  private readonly addDisabledDateUseCase = inject(AddDisabledDateUseCase);
  private readonly removeDisabledDateUseCase = inject(RemoveDisabledDateUseCase);

  // Shared state
  protected readonly appointments = signal<readonly Appointment[]>([]);
  protected readonly disabledDates = signal<readonly DisabledDate[]>([]);
  protected readonly activeTab = signal<Tab>('appointments');
  protected readonly confirmDeleteId = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);

  // Availability state
  protected readonly currentMonth = signal(new Date());
  protected readonly selectedDate = signal<string | null>(null);
  protected readonly reasonInput = signal('');

  readonly weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  protected readonly monthLabel = computed(() => {
    const date = this.currentMonth();
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  protected readonly disabledDateSet = computed(() => {
    const map = new Map<string, DisabledDate>();
    for (const dd of this.disabledDates()) {
      map.set(dd.date, dd);
    }
    return map;
  });

  protected readonly isSelectedDisabled = computed(() => {
    const date = this.selectedDate();
    return date ? this.disabledDateSet().has(date) : false;
  });

  protected readonly selectedReason = computed(() => {
    const date = this.selectedDate();
    return date ? this.disabledDateSet().get(date)?.reason : undefined;
  });

  protected readonly daysGrid = computed<readonly CalendarDay[]>(() => {
    const date = this.currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const disabled = this.disabledDateSet();
    const holidays = getFrenchHolidays(year);
    const selected = this.selectedDate();

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days: CalendarDay[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        date: `placeholder-${i}`,
        dayNumber: 0,
        isCurrentMonth: false,
        isToday: false,
        isDisabled: false,
        isAutoBlocked: false,
        isSelected: false,
        cssClass: '',
        ariaLabel: '',
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dayDate = new Date(year, month, d);
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dd = disabled.get(dateString);
      const autoReason = getUnavailableReason(dayDate, holidays);
      const isToday = dayDate.getTime() === today.getTime();
      const isDisabled = !!dd;
      const isAutoBlocked = !!autoReason;
      const isSelected = selected === dateString;
      const reason = dd?.reason;
      const autoBlockedReason = autoReason ?? undefined;
      days.push({
        date: dateString,
        dayNumber: d,
        isCurrentMonth: true,
        isToday,
        isDisabled,
        reason,
        isAutoBlocked,
        autoBlockedReason,
        isSelected,
        cssClass: this.computeDayClass({ isSelected, isDisabled, isAutoBlocked, isToday }),
        ariaLabel: this.computeDayLabel(dateString, {
          isDisabled,
          isAutoBlocked,
          reason,
          autoBlockedReason,
        }),
      });
    }

    return days;
  });

  protected readonly appointmentRows = computed<readonly AppointmentRow[]>(() =>
    this.appointments().map((appointment) => ({
      appointment,
      coachingLabel: this.computeCoachingLabel(appointment.coachingType),
      dateTime: this.computeDateTime(appointment),
      statusClass: this.computeStatusClass(appointment.status),
      statusLabel: this.computeStatusLabel(appointment.status),
    })),
  );

  protected readonly disabledDateRows = computed<readonly DisabledDateRow[]>(() =>
    this.disabledDates().map((disabledDate) => ({
      disabledDate,
      dateLabel: this.computeDate(disabledDate.date),
    })),
  );

  protected readonly selectedDateLabel = computed(() => {
    const date = this.selectedDate();
    return date ? this.computeDate(date) : '';
  });

  constructor() {
    this.loadAppointments();
    this.loadDisabledDates();
  }

  // Appointments

  private computeStatusClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  private computeStatusLabel(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      case 'completed':
        return 'Terminé';
      default:
        return status;
    }
  }

  private computeCoachingLabel(type: string): string {
    return COACHING_TYPE_LABELS[type as keyof typeof COACHING_TYPE_LABELS] ?? type;
  }

  private computeDateTime(appt: Appointment): string {
    const [year, month, day] = appt.appointmentDate.split('-').map(Number);
    const dateStr = new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${dateStr}, ${appt.appointmentTime}`;
  }

  protected async updateStatus(id: string, status: AppointmentStatus): Promise<void> {
    await this.updateAppointmentStatus.execute(id, status);
    this.loadAppointments();
  }

  protected async deleteAppointment(id: string): Promise<void> {
    await this.deleteAppointmentUseCase.execute(id);
    this.confirmDeleteId.set(null);
    this.loadAppointments();
  }

  // Availability

  protected previousMonth(): void {
    this.currentMonth.update((d) => {
      const n = new Date(d);
      n.setMonth(n.getMonth() - 1);
      return n;
    });
  }

  protected nextMonth(): void {
    this.currentMonth.update((d) => {
      const n = new Date(d);
      n.setMonth(n.getMonth() + 1);
      return n;
    });
  }

  protected toggleDate(day: CalendarDay): void {
    this.selectedDate.set(day.date);
    this.reasonInput.set('');
  }

  protected async disableDate(): Promise<void> {
    const date = this.selectedDate();
    if (!date) return;

    await this.addDisabledDateUseCase.execute({
      date,
      reason: this.reasonInput() || undefined,
    });
    this.reasonInput.set('');
    this.loadDisabledDates();
  }

  protected async enableDate(): Promise<void> {
    const date = this.selectedDate();
    if (!date) return;

    const dd = this.disabledDateSet().get(date);
    if (!dd) return;

    await this.removeDisabledDateUseCase.execute(dd.id);
    this.loadDisabledDates();
  }

  protected async removeDate(dd: DisabledDate): Promise<void> {
    await this.removeDisabledDateUseCase.execute(dd.id);
    this.loadDisabledDates();
  }

  private computeDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private computeDayLabel(
    dateStr: string,
    state: {
      isDisabled: boolean;
      isAutoBlocked: boolean;
      reason?: string;
      autoBlockedReason?: string;
    },
  ): string {
    const full = this.computeDate(dateStr);
    if (state.isDisabled) return `${full}, désactivé${state.reason ? ' : ' + state.reason : ''}`;
    if (state.isAutoBlocked) return `${full}, ${state.autoBlockedReason}`;
    return `${full}, disponible`;
  }

  private computeDayClass(state: {
    isSelected: boolean;
    isDisabled: boolean;
    isAutoBlocked: boolean;
    isToday: boolean;
  }): string {
    const base =
      'relative h-12 w-full rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

    if (state.isSelected && state.isDisabled) {
      return `${base} bg-red-100 text-red-700 ring-2 ring-red-400 shadow-lg`;
    }
    if (state.isSelected) {
      return `${base} bg-brand-100 text-brand-700 ring-2 ring-brand-500 shadow-lg shadow-brand-500/25`;
    }
    if (state.isDisabled) {
      return `${base} bg-red-50 text-red-500 border border-red-100 hover:bg-red-100`;
    }
    if (state.isAutoBlocked) {
      return `${base} bg-amber-50 text-amber-500 border border-amber-100 hover:bg-amber-100`;
    }
    if (state.isToday) {
      return `${base} bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100`;
    }
    return `${base} text-slate-700 hover:bg-slate-50 hover:text-brand-700`;
  }

  // Data loading

  protected async loadAppointments(): Promise<void> {
    try {
      const appts = await this.getAllAppointments.execute();
      this.appointments.set(appts);
      this.loadError.set(null);
    } catch {
      this.loadError.set('Impossible de charger les rendez-vous. Vérifiez votre connexion.');
    }
  }

  private async loadDisabledDates(): Promise<void> {
    const dates = await this.getDisabledDatesUseCase.execute();
    this.disabledDates.set(dates);
  }
}
