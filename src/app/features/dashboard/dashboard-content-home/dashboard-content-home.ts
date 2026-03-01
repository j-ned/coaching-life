import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GetSiteSettingUseCase } from '../../content/domain/use-cases/get-site-setting.use-case';
import { UpdateSiteSettingUseCase } from '../../content/domain/use-cases/update-site-setting.use-case';
import { UploadImageUseCase } from '../../content/domain/use-cases/upload-image.use-case';
import {
  DEFAULT_HERO,
  DEFAULT_HOME_CTA,
  DEFAULT_HOME_SERVICES,
} from '../../content/domain/models/default-content';
import type {
  HeroSettings,
  HomeCTASettings,
  HomeServicesSettings,
} from '../../content/domain/models/site-settings.model';
import { ImageDropzone } from '../../../shared/components/image-dropzone/image-dropzone';
import { Icon } from '../../../shared/components/icon/icon';
import { forkJoin } from 'rxjs';

type HeroFormShape = {
  title: FormControl<string>;
  subtitle: FormControl<string>;
  ctaPrimaryText: FormControl<string>;
  ctaPrimaryLink: FormControl<string>;
  ctaSecondaryText: FormControl<string>;
  ctaSecondaryLink: FormControl<string>;
  imageAlt: FormControl<string>;
};

type ServicesFormShape = {
  badge: FormControl<string>;
  title: FormControl<string>;
  subtitle: FormControl<string>;
};

type CTAFormShape = {
  badge: FormControl<string>;
  title: FormControl<string>;
  subtitle: FormControl<string>;
};

@Component({
  selector: 'app-dashboard-content-home',
  imports: [ReactiveFormsModule, RouterLink, ImageDropzone, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="mb-8 flex items-center gap-4">
      <a
        routerLink="/dashboard/content"
        class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
      >
        <app-icon name="chevron-left" size="lg" />
      </a>
      <div>
        <h2 class="text-2xl font-bold text-slate-800">Page d'accueil</h2>
        <p class="text-sm text-slate-500 mt-0.5">
          Modifiez le contenu visible sur votre page d'accueil
        </p>
      </div>
    </div>

    @if (isLoading()) {
      <div class="flex items-center justify-center py-20">
        <div
          class="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"
        ></div>
      </div>
    } @else {
      <!-- Toast feedback -->
      @if (saveSuccess()) {
        <div
          class="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-3 animate-fade-in"
          role="alert"
        >
          <app-icon name="check-circle" size="md" />
          <span class="font-medium">Contenu enregistré avec succès !</span>
        </div>
      }
      @if (saveError()) {
        <div
          class="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3"
          role="alert"
        >
          <app-icon name="info" size="md" />
          <span>{{ saveError() }}</span>
        </div>
      }

      <div class="space-y-6 max-w-3xl pb-24">
        <!-- Hero section -->
        <form
          [formGroup]="heroForm"
          class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div
            class="bg-gradient-to-r from-brand-500 to-brand-400 px-6 py-4 flex items-center gap-3"
          >
            <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <app-icon name="star" size="md" />
            </div>
            <div>
              <h3 class="text-white font-semibold">Section Hero</h3>
              <p class="text-white/80 text-xs">L'en-tête principal de votre page d'accueil</p>
            </div>
          </div>

          <div class="p-6 space-y-5">
            <div>
              <label for="heroTitle" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Titre principal <span aria-hidden="true" class="text-red-400">*</span></label
              >
              <input
                id="heroTitle"
                type="text"
                formControlName="title"
                placeholder="Ex : Révélez votre plein potentiel intérieur"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                aria-required="true"
              />
            </div>

            <div>
              <label for="heroSubtitle" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Sous-titre <span aria-hidden="true" class="text-red-400">*</span></label
              >
              <textarea
                id="heroSubtitle"
                formControlName="subtitle"
                rows="3"
                placeholder="Décrivez en quelques mots votre accompagnement..."
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
                aria-required="true"
              ></textarea>
            </div>

            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label for="ctaPrimaryText" class="block text-sm font-medium text-slate-700 mb-1.5"
                  >Bouton principal</label
                >
                <input
                  id="ctaPrimaryText"
                  type="text"
                  formControlName="ctaPrimaryText"
                  placeholder="Ex : Prendre rendez-vous"
                  class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                />
                <p class="text-xs text-slate-400 mt-1">Scrolle vers la section contact</p>
              </div>
              <div>
                <label
                  for="ctaSecondaryText"
                  class="block text-sm font-medium text-slate-700 mb-1.5"
                  >Bouton secondaire</label
                >
                <input
                  id="ctaSecondaryText"
                  type="text"
                  formControlName="ctaSecondaryText"
                  placeholder="Ex : Découvrir les services"
                  class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                />
                <p class="text-xs text-slate-400 mt-1">Scrolle vers les accompagnements</p>
              </div>
            </div>

            <div class="border-t border-slate-100 pt-5">
              <p class="text-sm font-medium text-slate-700 mb-3">Image hero</p>
              <app-image-dropzone
                [currentImageUrl]="heroImageUrl()"
                [isUploading]="isUploadingHeroImage()"
                (fileSelected)="onHeroImageSelected($event)"
              />
            </div>

            <div>
              <label for="heroImageAlt" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Description de l'image</label
              >
              <input
                id="heroImageAlt"
                type="text"
                formControlName="imageAlt"
                placeholder="Ex : Cabinet de coaching apaisant"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
              />
              <p class="text-xs text-slate-400 mt-1">
                Important pour l'accessibilité et le référencement
              </p>
            </div>
          </div>
        </form>

        <!-- Services section -->
        <form
          [formGroup]="servicesForm"
          class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div class="bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-4 flex items-center gap-3">
            <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <app-icon name="sparkles" size="md" />
            </div>
            <div>
              <h3 class="text-white font-semibold">Section Accompagnements</h3>
              <p class="text-white/80 text-xs">Le titre au-dessus de la grille de vos services</p>
            </div>
          </div>

          <div class="p-6 space-y-5">
            <div>
              <label for="servicesBadge" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Badge</label
              >
              <input
                id="servicesBadge"
                type="text"
                formControlName="badge"
                placeholder="Ex : MES ACCOMPAGNEMENTS"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
              <p class="text-xs text-slate-400 mt-1">Petit texte affiché au-dessus du titre</p>
            </div>

            <div>
              <label for="servicesTitle" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Titre <span aria-hidden="true" class="text-red-400">*</span></label
              >
              <input
                id="servicesTitle"
                type="text"
                formControlName="title"
                placeholder="Ex : Un accompagnement adapté à chaque besoin"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                aria-required="true"
              />
            </div>

            <div>
              <label for="servicesSubtitle" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Sous-titre</label
              >
              <textarea
                id="servicesSubtitle"
                formControlName="subtitle"
                rows="2"
                placeholder="Décrivez brièvement vos spécialités..."
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </form>

        <!-- CTA section -->
        <form
          [formGroup]="ctaForm"
          class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div
            class="bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-4 flex items-center gap-3"
          >
            <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <app-icon name="phone" size="md" />
            </div>
            <div>
              <h3 class="text-white font-semibold">Section Appel à l'action</h3>
              <p class="text-white/80 text-xs">
                Le texte qui invite vos visiteurs à vous contacter
              </p>
            </div>
          </div>

          <div class="p-6 space-y-5">
            <div>
              <label for="ctaBadge" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Badge</label
              >
              <input
                id="ctaBadge"
                type="text"
                formControlName="badge"
                placeholder="Ex : PASSEZ À L'ACTION"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div>
              <label for="ctaTitle" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Titre <span aria-hidden="true" class="text-red-400">*</span></label
              >
              <input
                id="ctaTitle"
                type="text"
                formControlName="title"
                placeholder="Ex : Prêt(e) à commencer ?"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                aria-required="true"
              />
            </div>

            <div>
              <label for="ctaSubtitle" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Sous-titre</label
              >
              <textarea
                id="ctaSubtitle"
                formControlName="subtitle"
                rows="2"
                placeholder="Encouragez vos visiteurs à passer à l'action..."
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </form>
      </div>

      <!-- Sticky save bar -->
      <div
        class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 py-4 px-6 z-40"
      >
        <div class="max-w-3xl mx-auto flex items-center justify-between">
          <a
            routerLink="/dashboard/content"
            class="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            Annuler
          </a>
          <button
            type="button"
            (click)="saveAll()"
            [disabled]="isSaving()"
            class="px-8 py-2.5 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            @if (isSaving()) {
              <span class="flex items-center gap-2">
                <span
                  class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                ></span>
                Enregistrement...
              </span>
            } @else {
              Enregistrer tout
            }
          </button>
        </div>
      </div>
    }
  `,
})
export class DashboardContentHome {
  private readonly getSiteSetting = inject(GetSiteSettingUseCase);
  private readonly updateSiteSetting = inject(UpdateSiteSettingUseCase);
  private readonly uploadImage = inject(UploadImageUseCase);

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isUploadingHeroImage = signal(false);
  protected readonly saveSuccess = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly heroImageUrl = signal<string | null>(null);
  private _pendingHeroImageFile = signal<File | null>(null);

  protected readonly heroForm = new FormGroup<HeroFormShape>({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subtitle: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ctaPrimaryText: new FormControl('', { nonNullable: true }),
    ctaPrimaryLink: new FormControl('', { nonNullable: true }),
    ctaSecondaryText: new FormControl('', { nonNullable: true }),
    ctaSecondaryLink: new FormControl('', { nonNullable: true }),
    imageAlt: new FormControl('', { nonNullable: true }),
  });

  protected readonly servicesForm = new FormGroup<ServicesFormShape>({
    badge: new FormControl('', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subtitle: new FormControl('', { nonNullable: true }),
  });

  protected readonly ctaForm = new FormGroup<CTAFormShape>({
    badge: new FormControl('', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subtitle: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    forkJoin({
      hero: this.getSiteSetting.execute<HeroSettings>('home_hero'),
      services: this.getSiteSetting.execute<HomeServicesSettings>('home_services'),
      cta: this.getSiteSetting.execute<HomeCTASettings>('home_cta'),
    }).subscribe(({ hero, services, cta }) => {
      const h = hero ?? DEFAULT_HERO;
      this.heroForm.patchValue({
        title: h.title,
        subtitle: h.subtitle,
        ctaPrimaryText: h.ctaPrimaryText,
        ctaPrimaryLink: h.ctaPrimaryLink,
        ctaSecondaryText: h.ctaSecondaryText,
        ctaSecondaryLink: h.ctaSecondaryLink,
        imageAlt: h.imageAlt,
      });
      this.heroImageUrl.set(h.imageUrl || null);

      const s = services ?? DEFAULT_HOME_SERVICES;
      this.servicesForm.patchValue({
        badge: s.badge,
        title: s.title,
        subtitle: s.subtitle,
      });

      const c = cta ?? DEFAULT_HOME_CTA;
      this.ctaForm.patchValue({
        badge: c.badge,
        title: c.title,
        subtitle: c.subtitle,
      });

      this.isLoading.set(false);
    });
  }

  protected onHeroImageSelected(file: File): void {
    this._pendingHeroImageFile.set(file);
  }

  protected saveAll(): void {
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    const pendingFile = this._pendingHeroImageFile();
    if (pendingFile) {
      this.isUploadingHeroImage.set(true);
      const path = `home/hero-${Date.now()}-${pendingFile.name}`;
      this.uploadImage.execute(pendingFile, path).subscribe({
        next: (result) => {
          this.isUploadingHeroImage.set(false);
          this._pendingHeroImageFile.set(null);
          this.heroImageUrl.set(result.publicUrl);
          this.saveAllSettings(result.publicUrl);
        },
        error: () => {
          this.isUploadingHeroImage.set(false);
          this.isSaving.set(false);
          this.saveError.set("Erreur lors de l'upload de l'image.");
        },
      });
    } else {
      this.saveAllSettings(this.heroImageUrl() ?? '');
    }
  }

  private saveAllSettings(heroImageUrl: string): void {
    const heroValue = this.heroForm.getRawValue();
    const heroSettings: HeroSettings = {
      ...heroValue,
      imageUrl: heroImageUrl,
    };

    const servicesSettings: HomeServicesSettings = this.servicesForm.getRawValue();
    const ctaSettings: HomeCTASettings = this.ctaForm.getRawValue();

    forkJoin({
      hero: this.updateSiteSetting.execute('home_hero', heroSettings),
      services: this.updateSiteSetting.execute('home_services', servicesSettings),
      cta: this.updateSiteSetting.execute('home_cta', ctaSettings),
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 4000);
      },
      error: () => {
        this.isSaving.set(false);
        this.saveError.set('Erreur lors de la sauvegarde.');
      },
    });
  }
}
