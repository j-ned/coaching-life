import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import type { Appointment } from '../domain/models/appointment.model';
import {
  BOOKING_DURATIONS,
  type BookingDuration,
  bookingThreshold,
  isSlotTooSoon,
  listSlotStarts,
} from '../domain/booking-rules';
import { Icon } from '../../../shared/components/icon/icon';

type SlotSelection = {
  readonly time: string;
  readonly duration: BookingDuration;
};

const DURATION_LABELS: Readonly<Record<BookingDuration, string>> = { 30: '30 min', 60: '1h' };

@Component({
  selector: 'app-booking-time-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [Icon],
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full">
      <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <app-icon name="clock" size="md" class="text-brand-700" />
        Choisissez un créneau
      </h2>

      <fieldset class="flex gap-2 mb-6 border-0 p-0 m-0">
        <legend class="sr-only">Durée</legend>
        @for (duration of durations; track duration) {
          <button
            (click)="setDuration(duration)"
            [class]="
              selectedDuration() === duration
                ? 'px-4 py-2 rounded-lg text-sm font-medium bg-brand-700 text-white transition-colors'
                : 'px-4 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-brand-300 transition-colors'
            "
          >
            {{ durationLabels[duration] }}
          </button>
        }
      </fieldset>

      <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
        @for (slot of availableSlots(); track slot.time) {
          <button
            [disabled]="slot.isBooked"
            (click)="selectTime(slot.time)"
            [class]="slot.cssClass"
            [attr.aria-label]="slot.ariaLabel"
            [attr.aria-pressed]="slot.isSelected"
          >
            {{ slot.time }}
          </button>
        }
      </div>

      @if (availableSlots().length === 0) {
        <p class="text-slate-500 text-sm text-center py-4">
          Aucun créneau disponible pour cette date.
        </p>
      }
    </div>
  `,
})
export class BookingTimePicker {
  readonly date = input.required<string>();
  readonly bookedSlots = input<readonly Appointment[]>([]);
  readonly slotSelected = output<SlotSelection>();

  readonly selectedTime = signal<string | null>(null);
  readonly selectedDuration = signal<BookingDuration>(60);

  protected readonly durations = BOOKING_DURATIONS;
  protected readonly durationLabels = DURATION_LABELS;

  readonly availableSlots = computed(() => {
    const dateValue = this.date();
    const duration = this.selectedDuration();
    const selected = this.selectedTime();
    const threshold = bookingThreshold(new Date());
    const booked = this.bookedSlots().filter((b) => b.appointmentDate === dateValue);

    return listSlotStarts(duration)
      .filter((time) => !isSlotTooSoon(dateValue, time, threshold))
      .map((time) => {
        const slotStart = this.timeToMinutes(time);
        const slotEnd = slotStart + duration;
        const isBooked = booked.some((b) => {
          const bookedStart = this.timeToMinutes(b.appointmentTime);
          return slotStart < bookedStart + b.duration && slotEnd > bookedStart;
        });
        const isSelected = selected === time;
        return {
          time,
          isBooked,
          isSelected,
          cssClass: this.computeSlotClass(isBooked, isSelected),
          ariaLabel: isBooked ? `${time}, créneau réservé` : `${time}, disponible`,
        };
      });
  });

  setDuration(duration: BookingDuration): void {
    this.selectedDuration.set(duration);
    this.selectedTime.set(null);
  }

  selectTime(time: string): void {
    this.selectedTime.set(time);
    this.slotSelected.emit({ time, duration: this.selectedDuration() });
  }

  private computeSlotClass(isBooked: boolean, isSelected: boolean): string {
    const base =
      'py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

    if (isBooked) {
      return `${base} bg-slate-50 text-slate-300 line-through cursor-not-allowed`;
    }

    if (isSelected) {
      return `${base} bg-brand-700 text-white ring-2 ring-brand-500 shadow-lg shadow-brand-500/25`;
    }

    return `${base} bg-slate-50 border border-slate-200 text-slate-700 hover:border-brand-300 hover:text-brand-700 cursor-pointer`;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
