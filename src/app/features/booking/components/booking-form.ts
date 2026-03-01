import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Icon } from '../../../shared/components/icon/icon';
import type { CoachingType } from '../domain/models/appointment.model';
import { COACHING_TYPE_LABELS } from '../domain/models/appointment.model';

type BookingFormGroup = {
  clientName: FormControl<string>;
  clientEmail: FormControl<string>;
  clientPhone: FormControl<string>;
  coachingType: FormControl<CoachingType | ''>;
  message: FormControl<string>;
};

export type BookingFormPayload = {
  readonly clientName: string;
  readonly clientEmail: string;
  readonly clientPhone: string;
  readonly coachingType: CoachingType;
  readonly message: string;
};

@Component({
  selector: 'app-booking-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, Icon],
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 h-full">
      <output
        class="mb-6 p-4 rounded-xl bg-brand-50 border border-brand-100 flex items-center gap-3 block"
      >
        <app-icon name="calendar" size="md" class="text-brand-500 shrink-0" />
        <div class="text-sm">
          <span class="font-medium text-slate-800">{{ formattedDate() }}</span>
          <span class="text-slate-400 mx-1">&middot;</span>
          <span class="text-slate-700">{{ selectedTime() }}</span>
          <span class="text-slate-400 mx-1">&middot;</span>
          <span class="text-slate-500">{{ selectedDuration() }} min</span>
        </div>
      </output>

      <h2 class="text-lg font-bold text-slate-800 mb-6">Vos coordonnées</h2>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
        <fieldset class="space-y-5 border-0 p-0 m-0">
          <legend class="sr-only">Vos coordonnées</legend>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label for="booking-name" class="block text-sm font-medium text-slate-700 mb-1.5">
                Nom complet <span aria-hidden="true">*</span>
              </label>
              <div class="relative">
                <app-icon
                  name="user"
                  size="md"
                  class="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  id="booking-name"
                  type="text"
                  formControlName="clientName"
                  class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none transition-colors"
                  placeholder="Votre nom"
                  aria-required="true"
                  autocomplete="name"
                />
              </div>
              @if (
                form.controls.clientName.touched && form.controls.clientName.errors?.['required']
              ) {
                <small class="text-red-500 text-xs mt-1 block" role="alert"
                  >Le nom est obligatoire</small
                >
              } @else if (
                form.controls.clientName.touched && form.controls.clientName.errors?.['minlength']
              ) {
                <small class="text-red-500 text-xs mt-1 block" role="alert"
                  >Le nom doit contenir au moins 2 caractères</small
                >
              }
            </div>

            <div>
              <label for="booking-email" class="block text-sm font-medium text-slate-700 mb-1.5">
                Email <span aria-hidden="true">*</span>
              </label>
              <div class="relative">
                <app-icon
                  name="mail"
                  size="md"
                  class="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  id="booking-email"
                  type="email"
                  formControlName="clientEmail"
                  class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none transition-colors"
                  placeholder="votre@email.com"
                  aria-required="true"
                  autocomplete="email"
                />
              </div>
              @if (
                form.controls.clientEmail.touched && form.controls.clientEmail.errors?.['required']
              ) {
                <small class="text-red-500 text-xs mt-1 block" role="alert"
                  >L'email est obligatoire</small
                >
              } @else if (
                form.controls.clientEmail.touched && form.controls.clientEmail.errors?.['email']
              ) {
                <small class="text-red-500 text-xs mt-1 block" role="alert"
                  >Le format de l'email est invalide</small
                >
              }
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label for="booking-phone" class="block text-sm font-medium text-slate-700 mb-1.5">
                Téléphone <span aria-hidden="true">*</span>
              </label>
              <div class="relative">
                <app-icon
                  name="phone"
                  size="md"
                  class="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  id="booking-phone"
                  type="tel"
                  formControlName="clientPhone"
                  class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none transition-colors"
                  placeholder="06 12 34 56 78"
                  aria-required="true"
                  autocomplete="tel"
                />
              </div>
              @if (
                form.controls.clientPhone.touched && form.controls.clientPhone.errors?.['required']
              ) {
                <small class="text-red-500 text-xs mt-1 block" role="alert"
                  >Le téléphone est obligatoire</small
                >
              } @else if (
                form.controls.clientPhone.touched && form.controls.clientPhone.errors?.['pattern']
              ) {
                <small class="text-red-500 text-xs mt-1 block" role="alert"
                  >Le numéro doit contenir 10 chiffres</small
                >
              }
            </div>

            <div>
              <label
                for="booking-coaching-type"
                class="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Type de coaching <span aria-hidden="true">*</span>
              </label>
              <select
                id="booking-coaching-type"
                formControlName="coachingType"
                class="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:border-brand-500 focus:outline-none transition-colors"
                aria-required="true"
              >
                <option value="">-- Sélectionner --</option>
                @for (type of coachingTypes; track type.value) {
                  <option [value]="type.value">{{ type.label }}</option>
                }
              </select>
              @if (
                form.controls.coachingType.touched &&
                form.controls.coachingType.errors?.['required']
              ) {
                <small class="text-red-500 text-xs mt-1 block" role="alert"
                  >Le type de coaching est obligatoire</small
                >
              }
            </div>
          </div>

          <div>
            <label for="booking-message" class="block text-sm font-medium text-slate-700 mb-1.5">
              Message <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="booking-message"
              formControlName="message"
              rows="4"
              class="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none transition-colors resize-none"
              placeholder="Décrivez votre besoin ou votre situation..."
              aria-required="true"
            ></textarea>
            @if (form.controls.message.touched && form.controls.message.errors?.['required']) {
              <small class="text-red-500 text-xs mt-1 block" role="alert"
                >Le message est obligatoire</small
              >
            } @else if (
              form.controls.message.touched && form.controls.message.errors?.['minlength']
            ) {
              <small class="text-red-500 text-xs mt-1 block" role="alert"
                >Le message doit contenir au moins 10 caractères</small
              >
            }
          </div>
        </fieldset>

        <button
          type="submit"
          [disabled]="form.invalid || isSubmitting()"
          class="w-full py-3 px-6 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 hover:-translate-y-0.5 shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
        >
          @if (isSubmitting()) {
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
            Réservation en cours...
          } @else {
            <app-icon name="check" size="md" />
            Confirmer la réservation
          }
        </button>
      </form>
    </div>
  `,
})
export class BookingForm {
  readonly selectedDate = input.required<string>();
  readonly selectedTime = input.required<string>();
  readonly selectedDuration = input.required<number>();
  readonly formSubmitted = output<BookingFormPayload>();

  readonly isSubmitting = signal(false);

  readonly coachingTypes = Object.entries(COACHING_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  readonly form = new FormGroup<BookingFormGroup>({
    clientName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    clientEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    clientPhone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{10}$/)],
    }),
    coachingType: new FormControl<CoachingType | ''>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  readonly formattedDate = computed(() => {
    const date = new Date(this.selectedDate() + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.formSubmitted.emit({
      clientName: raw.clientName,
      clientEmail: raw.clientEmail,
      clientPhone: raw.clientPhone,
      coachingType: raw.coachingType as CoachingType,
      message: raw.message,
    });
  }

  setSubmitting(value: boolean): void {
    this.isSubmitting.set(value);
  }

  resetForm(): void {
    this.form.reset();
  }
}
