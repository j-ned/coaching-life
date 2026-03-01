import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SendMessageUseCase } from './domain/use-cases/send-message.use-case';
import { Icon } from '../../shared/components/icon/icon';
import type { MessageSubject } from './domain/models/message.model';

type ContactFormShape = {
  name: FormControl<string>;
  email: FormControl<string>;
  subject: FormControl<MessageSubject>;
  message: FormControl<string>;
};

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-white rounded-2xl shadow-sm border border-slate-100 p-8' },
  template: `
    <h3 class="text-2xl font-semibold text-slate-800 mb-6">Contactez-moi</h3>

    @if (submitSuccess()) {
      <div class="bg-emerald-50 text-emerald-700 p-4 rounded-lg mb-6 flex items-start gap-3">
        <app-icon name="check-circle" size="lg" class="shrink-0 mt-0.5" />
        <div>
          <p class="font-medium">Message envoyé avec succès !</p>
          <p class="text-sm mt-1">Je vous répondrai dans les plus brefs délais.</p>
        </div>
      </div>
    }

    @if (submitError()) {
      <div class="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm">{{ submitError() }}</div>
    }

    <form [formGroup]="form" (ngSubmit)="submitContact()" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="contact-name" class="block text-sm font-medium text-slate-700 mb-1"
            >Nom complet <span aria-hidden="true">*</span></label
          >
          <input
            type="text"
            id="contact-name"
            formControlName="name"
            autocomplete="name"
            aria-required="true"
            class="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            placeholder="Votre nom"
            [class.border-red-500]="form.controls.name.touched && form.controls.name.invalid"
          />
          @if (form.controls.name.touched && form.controls.name.errors?.['required']) {
            <p class="text-sm text-red-500 mt-1" role="alert">Ce champ est requis.</p>
          }
        </div>
        <div>
          <label for="contact-email" class="block text-sm font-medium text-slate-700 mb-1"
            >Email <span aria-hidden="true">*</span></label
          >
          <input
            type="email"
            id="contact-email"
            formControlName="email"
            autocomplete="email"
            aria-required="true"
            class="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            placeholder="votre@email.com"
            [class.border-red-500]="form.controls.email.touched && form.controls.email.invalid"
          />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <p class="text-sm text-red-500 mt-1" role="alert">Un email valide est requis.</p>
          }
        </div>
      </div>

      <div>
        <label for="contact-subject" class="block text-sm font-medium text-slate-700 mb-1"
          >Sujet</label
        >
        <select
          id="contact-subject"
          formControlName="subject"
          class="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white"
        >
          <option value="">Sélectionnez un sujet</option>
          <option value="life_coach">Coaching de Vie</option>
          <option value="dev_personnel">Développement Personnel</option>
          <option value="equine">Coaching Equin</option>
          <option value="parents">Aide aux parents neuroatypiques</option>
          <option value="other">Autre demande</option>
        </select>
      </div>

      <div>
        <label for="contact-message" class="block text-sm font-medium text-slate-700 mb-1"
          >Message <span aria-hidden="true">*</span></label
        >
        <textarea
          id="contact-message"
          formControlName="message"
          rows="4"
          aria-required="true"
          class="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
          placeholder="Comment puis-je vous aider ?"
          [class.border-red-500]="form.controls.message.touched && form.controls.message.invalid"
        ></textarea>
        @if (form.controls.message.touched && form.controls.message.errors?.['required']) {
          <p class="text-sm text-red-500 mt-1" role="alert">Le message est requis.</p>
        }
      </div>

      <div>
        <button
          type="submit"
          [disabled]="form.invalid || isSubmitting()"
          class="w-full bg-brand-500 hover:bg-brand-600 focus-visible:ring-4 focus-visible:ring-brand-500/20 text-white font-medium rounded-lg px-5 py-3 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {{ isSubmitting() ? 'Envoi en cours...' : 'Envoyer le message' }}
        </button>
      </div>
    </form>
  `,
})
export class ContactForm {
  private readonly sendMessage = inject(SendMessageUseCase);

  protected readonly isSubmitting = signal(false);
  protected readonly submitSuccess = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = new FormGroup<ContactFormShape>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    subject: new FormControl('' as MessageSubject, { nonNullable: true }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected async submitContact(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const { name, email, subject, message } = this.form.getRawValue();

    try {
      const result = await this.sendMessage.execute({ name, email, subject, message });
      this.isSubmitting.set(false);
      if (result.success) {
        this.submitSuccess.set(true);
        this.form.reset();
        setTimeout(() => this.submitSuccess.set(false), 5000);
      } else {
        this.submitError.set(result.message);
      }
    } catch {
      this.isSubmitting.set(false);
      this.submitError.set('Une erreur est survenue. Veuillez réessayer.');
    }
  }
}
