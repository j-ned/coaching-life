import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import type { Appointment } from '../domain/models/appointment.model';
import { Icon } from '../../../shared/components/icon/icon';

type SlotSelection = {
  readonly time: string;
  readonly duration: number;
};

@Component({
  selector: 'app-booking-time-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [Icon],
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full">
      <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <app-icon name="clock" size="md" class="text-brand-500" />
        Choisissez un créneau
      </h2>

      <fieldset class="flex gap-2 mb-6 border-0 p-0 m-0">
        <legend class="sr-only">Durée</legend>
        <button
          (click)="setDuration(30)"
          [class]="
            selectedDuration() === 30
              ? 'px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white transition-colors'
              : 'px-4 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-brand-300 transition-colors'
          "
        >
          30 min
        </button>
        <button
          (click)="setDuration(60)"
          [class]="
            selectedDuration() === 60
              ? 'px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white transition-colors'
              : 'px-4 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-brand-300 transition-colors'
          "
        >
          1h
        </button>
      </fieldset>

      <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
        @for (slot of availableSlots(); track slot.time) {
          <button
            [disabled]="slot.isBooked"
            (click)="selectTime(slot.time)"
            [class]="getSlotClasses(slot)"
          >
            {{ slot.time }}
          </button>
        }
      </div>

      @if (availableSlots().length === 0) {
        <p class="text-slate-400 text-sm text-center py-4">
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
  readonly selectedDuration = signal(60);

  readonly availableSlots = computed(() => {
    const dateValue = this.date();
    const duration = this.selectedDuration();
    const booked = this.bookedSlots().filter((b) => b.appointmentDate === dateValue);

    const slots: { time: string; isBooked: boolean }[] = [];
    const startHour = 9;
    const endHour = 18;

    for (let h = startHour; h < endHour; h++) {
      for (const m of [0, 30]) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotEndMinutes = h * 60 + m + duration;

        if (slotEndMinutes > endHour * 60) continue;

        const isBooked = booked.some((b) => {
          const bookedStart = this.timeToMinutes(b.appointmentTime);
          const bookedEnd = bookedStart + b.duration;
          const slotStart = h * 60 + m;
          const slotEnd = slotStart + duration;
          return slotStart < bookedEnd && slotEnd > bookedStart;
        });

        slots.push({ time, isBooked });
      }
    }

    return slots;
  });

  setDuration(duration: number): void {
    this.selectedDuration.set(duration);
    this.selectedTime.set(null);
  }

  selectTime(time: string): void {
    this.selectedTime.set(time);
    this.slotSelected.emit({ time, duration: this.selectedDuration() });
  }

  getSlotClasses(slot: { time: string; isBooked: boolean }): string {
    const base = 'py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200';

    if (slot.isBooked) {
      return `${base} bg-slate-50 text-slate-300 line-through cursor-not-allowed`;
    }

    if (this.selectedTime() === slot.time) {
      return `${base} bg-brand-500 text-white ring-2 ring-brand-500 shadow-lg shadow-brand-500/25`;
    }

    return `${base} bg-slate-50 border border-slate-200 text-slate-700 hover:border-brand-300 hover:text-brand-500 cursor-pointer`;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
