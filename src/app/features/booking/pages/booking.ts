import { Component, ChangeDetectionStrategy, inject, signal, viewChild } from '@angular/core';
import type {
  Appointment,
  AppointmentFormData,
  DisabledDate,
} from '../domain/models/appointment.model';
import { GetBookedSlotsUseCase } from '../domain/use-cases/get-booked-slots.use-case';
import { GetDisabledDatesUseCase } from '../domain/use-cases/get-disabled-dates.use-case';
import { SubmitAppointmentUseCase } from '../domain/use-cases/submit-appointment.use-case';
import { BookingCalendar } from '../components/booking-calendar';
import { BookingTimePicker } from '../components/booking-time-picker';
import { BookingForm, type BookingFormPayload } from '../components/booking-form';

@Component({
  selector: 'app-booking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [BookingCalendar, BookingTimePicker, BookingForm],
  template: `
    <section aria-labelledby="booking-heading">
      <div class="text-center mb-10">
        <div
          class="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center text-brand-500 mx-auto mb-4"
        >
          <svg
            width="32"
            height="32"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <h2 id="booking-heading" class="text-2xl font-semibold text-slate-800 mb-2">
          Prendre Rendez-vous
        </h2>
        <p class="text-slate-600 max-w-md mx-auto">
          Choisissez une date et un créneau qui vous conviennent pour votre séance de coaching.
        </p>
      </div>

      @if (submissionMessage()) {
        <div
          [class]="
            submissionMessage()!.success
              ? 'mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm text-center'
              : 'mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center'
          "
        >
          {{ submissionMessage()!.message }}
        </div>
      }

      @defer (on viewport) {
        <div class="flex flex-col gap-6 max-w-5xl mx-auto">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <app-booking-calendar
              [bookedSlots]="bookedSlots()"
              [disabledDates]="disabledDates()"
              (selectedDateChange)="onDateSelected($event)"
            />

            @if (selectedDate()) {
              <app-booking-time-picker
                [date]="selectedDate()!"
                [bookedSlots]="bookedSlots()"
                (slotSelected)="onSlotSelected($event)"
              />
            } @else {
              <div
                class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center text-center min-h-64"
              >
                <svg
                  class="w-16 h-16 text-slate-200 mb-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p class="text-slate-500 text-lg font-medium mb-2">Sélectionnez un créneau</p>
                <p class="text-slate-400 text-sm max-w-xs">
                  Choisissez une date dans le calendrier puis un horaire pour accéder au formulaire
                  de réservation.
                </p>
              </div>
            }
          </div>

          @if (selectedDate() && selectedSlot()) {
            <app-booking-form
              [selectedDate]="selectedDate()!"
              [selectedTime]="selectedSlot()!.time"
              [selectedDuration]="selectedSlot()!.duration"
              (formSubmitted)="onFormSubmitted($event)"
            />
          }
        </div>
      } @placeholder {
        <div class="flex flex-col gap-6 max-w-5xl mx-auto">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="h-96 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse"></div>
            <div class="h-64 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      }
    </section>
  `,
})
export class Booking {
  private readonly getBookedSlotsUseCase = inject(GetBookedSlotsUseCase);
  private readonly getDisabledDatesUseCase = inject(GetDisabledDatesUseCase);
  private readonly submitAppointmentUseCase = inject(SubmitAppointmentUseCase);
  private readonly bookingFormRef = viewChild(BookingForm);
  private readonly calendarRef = viewChild(BookingCalendar);

  protected readonly selectedDate = signal<string | null>(null);
  protected readonly selectedSlot = signal<{ time: string; duration: number } | null>(null);
  protected readonly bookedSlots = signal<readonly Appointment[]>([]);
  protected readonly disabledDates = signal<readonly DisabledDate[]>([]);
  protected readonly submissionMessage = signal<{ success: boolean; message: string } | null>(null);

  constructor() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.loadBookedSlots(currentMonth);
    this.loadDisabledDates();
  }

  protected onDateSelected(date: string): void {
    this.selectedDate.set(date);
    this.selectedSlot.set(null);
    this.submissionMessage.set(null);

    const month = date.substring(0, 7);
    this.loadBookedSlots(month);
  }

  protected onSlotSelected(slot: { time: string; duration: number }): void {
    this.selectedSlot.set(slot);
  }

  protected onFormSubmitted(payload: BookingFormPayload): void {
    const formRef = this.bookingFormRef();
    if (!formRef) return;

    const date = this.selectedDate();
    const slot = this.selectedSlot();
    if (!date || !slot) return;

    formRef.setSubmitting(true);

    const data: AppointmentFormData = {
      appointmentDate: date,
      appointmentTime: slot.time,
      duration: slot.duration,
      ...payload,
    };

    this.submitAppointmentUseCase.execute(data).subscribe({
      next: (result) => {
        formRef.setSubmitting(false);
        this.submissionMessage.set(result);
        if (result.success) {
          this.selectedDate.set(null);
          this.selectedSlot.set(null);
          formRef.resetForm();
          const calendarMonth =
            this.calendarRef()?.currentMonthString() ?? new Date().toISOString().substring(0, 7);
          this.loadBookedSlots(calendarMonth);
        }
      },
      error: () => {
        formRef.setSubmitting(false);
        this.submissionMessage.set({
          success: false,
          message: 'Une erreur est survenue. Veuillez réessayer.',
        });
      },
    });
  }

  private loadBookedSlots(month: string): void {
    this.getBookedSlotsUseCase.execute(month).subscribe((slots) => {
      this.bookedSlots.set(slots);
    });
  }

  private loadDisabledDates(): void {
    this.getDisabledDatesUseCase.execute().subscribe((dates) => {
      this.disabledDates.set(dates);
    });
  }
}
