import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  output,
  viewChild,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginUseCase } from '../../domain/use-cases/login.use-case';
import { Icon } from '../../../../shared/components/icon/icon';

type LoginFormShape = {
  email: FormControl<string>;
  password: FormControl<string>;
};

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icon],
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'login-title',
    class:
      'fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm',
    '(keydown.escape)': 'closeModal()',
    '(keydown.tab)': 'trapFocus($event, false)',
    '(keydown.shift.tab)': 'trapFocus($event, true)',
  },
  template: `
    <div
      #panel
      class="relative w-full max-w-md bg-white p-8 shadow-2xl rounded-2xl border border-slate-100"
    >
      <button
        (click)="closeModal()"
        class="absolute top-4 right-4 text-slate-500 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md transition-colors"
        aria-label="Fermer"
      >
        <app-icon name="x" size="lg" />
      </button>

      <div class="text-center mb-8">
        <div
          class="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-brand-700 mx-auto mb-4"
        >
          <app-icon name="lock" size="xl" />
        </div>
        <h2 id="login-title" class="text-2xl font-bold text-slate-900">Accès Administrateur</h2>
        <p class="text-sm text-slate-500 mt-2">Connectez-vous avec vos identifiants</p>
      </div>

      <form class="space-y-5" [formGroup]="loginForm" (ngSubmit)="submitLogin()">
        <div>
          <label for="login-email" class="block text-sm font-medium text-slate-700 mb-1.5"
            >Email</label
          >
          <div class="relative">
            <app-icon
              name="mail"
              size="md"
              class="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              #emailInput
              id="login-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              aria-required="true"
              placeholder="admin@coaching-life.fr"
              class="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label for="login-password" class="block text-sm font-medium text-slate-700 mb-1.5"
            >Mot de passe</label
          >
          <div class="relative">
            <app-icon
              name="lock"
              size="md"
              class="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              id="login-password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              aria-required="true"
              placeholder="Votre mot de passe"
              class="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
            />
            <button
              type="button"
              (click)="togglePassword()"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              [attr.aria-label]="
                showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
              "
            >
              @if (showPassword()) {
                <app-icon name="eye-off" size="md" />
              } @else {
                <app-icon name="eye" size="md" />
              }
            </button>
          </div>
        </div>

        @if (error()) {
          <div class="rounded-xl bg-red-50 p-4 border border-red-100" role="alert">
            <p class="text-sm text-red-700">{{ error() }}</p>
          </div>
        }

        <button
          type="submit"
          [disabled]="loginForm.invalid || isLoading()"
          class="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-white bg-brand-700 hover:bg-brand-800 shadow-lg shadow-brand-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          @if (isLoading()) {
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
            Connexion en cours...
          } @else {
            <app-icon name="log-in" size="md" />
            Se connecter
          }
        </button>
      </form>
    </div>
  `,
})
export class Login {
  private readonly router = inject(Router);
  private readonly loginUseCase = inject(LoginUseCase);
  readonly closed = output<void>();

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly emailInput = viewChild.required<ElementRef<HTMLInputElement>>('emailInput');

  constructor() {
    afterNextRender({
      write: () => this.emailInput().nativeElement.focus(),
    });
  }

  protected readonly loginForm = new FormGroup<LoginFormShape>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  closeModal(): void {
    this.closed.emit();
  }

  trapFocus(event: Event, backward: boolean): void {
    const focusables = this.panel().nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (backward && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!backward && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async submitLogin(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.error.set(null);

    const { email, password } = this.loginForm.getRawValue();

    try {
      await this.loginUseCase.execute({ email, password });
      this.isLoading.set(false);
      this.closed.emit();
      this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      this.isLoading.set(false);
      const message = err instanceof Error ? err.message : '';
      this.error.set(
        message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : message || 'Erreur de connexion.',
      );
    }
  }
}
