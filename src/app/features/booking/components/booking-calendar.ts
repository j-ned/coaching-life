import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import type { Appointment, DisabledDate } from '../domain/models/appointment.model';
import { Icon } from '../../../shared/components/icon/icon';
import { getFrenchHolidays, getUnavailableReason } from '../../../shared/calendar/french-holidays';

type CalendarDay = {
  readonly date: string;
  readonly dayNumber: number;
  readonly isCurrentMonth: boolean;
  readonly isPast: boolean;
  readonly isToday: boolean;
  readonly hasBooking: boolean;
  readonly isDisabled: boolean;
  readonly disabledReason?: string;
};

@Component({
  selector: 'app-booking-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [Icon],
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <header class="flex items-center justify-between mb-6">
        <button
          (click)="previousMonth()"
          class="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center hover:border-brand-300 hover:text-brand-700 transition-colors"
          aria-label="Mois précédent"
        >
          <app-icon name="chevron-left" size="md" />
        </button>
        <h2 class="text-lg font-bold text-slate-800 capitalize">{{ monthLabel() }}</h2>
        <button
          (click)="nextMonth()"
          class="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center hover:border-brand-300 hover:text-brand-700 transition-colors"
          aria-label="Mois suivant"
        >
          <app-icon name="chevron-right" size="md" />
        </button>
      </header>

      <div class="grid grid-cols-7 gap-1 mb-2">
        @for (day of weekDays; track day) {
          <div class="text-center text-xs font-medium text-slate-500 py-2">{{ day }}</div>
        }
      </div>

      <div class="grid grid-cols-7 gap-1">
        @for (day of daysGrid(); track day.date) {
          @if (day.isCurrentMonth) {
            <button
              [disabled]="day.isPast || day.isDisabled"
              (click)="selectDate(day)"
              [class]="getDayClasses(day)"
              [title]="day.disabledReason ?? ''"
            >
              <span>{{ day.dayNumber }}</span>
              @if (day.hasBooking) {
                <span
                  class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-400"
                ></span>
              }
            </button>
          } @else {
            <div class="h-10"></div>
          }
        }
      </div>
    </div>
  `,
})
export class BookingCalendar {
  readonly bookedSlots = input<readonly Appointment[]>([]);
  readonly disabledDates = input<readonly DisabledDate[]>([]);
  readonly selectedDateChange = output<string>();

  readonly currentMonth = signal(new Date());
  readonly selectedDate = signal<string | null>(null);

  readonly weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  readonly monthLabel = computed(() => {
    const date = this.currentMonth();
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  readonly currentMonthString = computed(() => {
    const d = this.currentMonth();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  readonly daysGrid = computed(() => {
    const date = this.currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookedDates = new Set(this.bookedSlots().map((b) => b.appointmentDate));
    const adminDisabled = new Map(this.disabledDates().map((d) => [d.date, d.reason]));
    const holidays = getFrenchHolidays(year);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days: CalendarDay[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        date: `placeholder-${i}`,
        dayNumber: 0,
        isCurrentMonth: false,
        isPast: false,
        isToday: false,
        hasBooking: false,
        isDisabled: false,
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dayDate = new Date(year, month, d);
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const adminReason = adminDisabled.get(dateString);
      const unavailableReason = getUnavailableReason(dayDate, holidays);
      const disabledReason = adminReason ?? unavailableReason ?? undefined;

      days.push({
        date: dateString,
        dayNumber: d,
        isCurrentMonth: true,
        isPast: dayDate < today,
        isToday: dayDate.getTime() === today.getTime(),
        hasBooking: bookedDates.has(dateString),
        isDisabled: !!disabledReason,
        disabledReason,
      });
    }

    return days;
  });

  previousMonth(): void {
    this.currentMonth.update((d) => {
      const newDate = new Date(d);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }

  nextMonth(): void {
    this.currentMonth.update((d) => {
      const newDate = new Date(d);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }

  selectDate(day: CalendarDay): void {
    if (day.isDisabled || day.isPast) return;
    this.selectedDate.set(day.date);
    this.selectedDateChange.emit(day.date);
  }

  getDayClasses(day: CalendarDay): string {
    const base =
      'relative h-10 w-full rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center';

    if (day.isPast) {
      return `${base} text-slate-300 cursor-not-allowed`;
    }

    if (day.isDisabled) {
      return `${base} bg-red-50 text-slate-400 cursor-not-allowed border border-red-100`;
    }

    if (this.selectedDate() === day.date) {
      return `${base} bg-brand-700 text-white ring-2 ring-brand-500 shadow-lg shadow-brand-500/25`;
    }

    if (day.isToday) {
      return `${base} bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100 cursor-pointer`;
    }

    return `${base} text-slate-700 hover:bg-slate-50 hover:text-brand-700 cursor-pointer`;
  }
}
