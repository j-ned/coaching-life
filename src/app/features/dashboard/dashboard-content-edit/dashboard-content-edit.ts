import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GetPageContentUseCase } from '../../content/domain/use-cases/get-page-content.use-case';
import { UpdatePageContentUseCase } from '../../content/domain/use-cases/update-page-content.use-case';
import { UploadImageUseCase } from '../../content/domain/use-cases/upload-image.use-case';
import { DEFAULT_PAGES } from '../../content/domain/models/default-content';
import type { PageContentItem, PageSlug } from '../../content/domain/models/page-content.model';
import { ImageDropzone } from '../../../shared/components/image-dropzone/image-dropzone';
import { Icon } from '../../../shared/components/icon/icon';

type ItemFormGroup = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
}>;

type PageFormShape = {
  title: FormControl<string>;
  introduction: FormControl<string>;
  sectionTitle: FormControl<string>;
  items: FormArray<ItemFormGroup>;
  extraText: FormControl<string>;
  imageAlt: FormControl<string>;
};

const PAGE_COLORS: Record<string, { from: string; to: string }> = {
  'life-coach': { from: 'from-brand-500', to: 'to-brand-400' },
  'personal-development': { from: 'from-blue-500', to: 'to-blue-400' },
  'equine-coaching': { from: 'from-amber-500', to: 'to-amber-400' },
  'neuroatypical-parents': { from: 'from-rose-500', to: 'to-rose-400' },
};

const PAGE_ICONS: Record<string, string> = {
  'life-coach': 'sparkles',
  'personal-development': 'book-open',
  'equine-coaching': 'smile',
  'neuroatypical-parents': 'heart',
};

@Component({
  selector: 'app-dashboard-content-edit',
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
        <h2 class="text-2xl font-bold text-slate-800">{{ pageTitle() }}</h2>
        <p class="text-sm text-slate-500 mt-0.5">Modifiez le contenu de cette page</p>
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
          class="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-3"
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

      <form [formGroup]="form" (ngSubmit)="save()" class="space-y-6 max-w-3xl pb-24">
        <!-- Content principal -->
        <section class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="px-6 py-4 flex items-center gap-3" [class]="headerGradient()">
            <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <app-icon [name]="pageIcon()" size="md" />
            </div>
            <div>
              <h3 class="text-white font-semibold">Contenu principal</h3>
              <p class="text-white/80 text-xs">Le titre et l'introduction de la page</p>
            </div>
          </div>

          <div class="p-6 space-y-5">
            <div>
              <label for="title" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Titre de la page <span aria-hidden="true" class="text-red-400">*</span></label
              >
              <input
                id="title"
                type="text"
                formControlName="title"
                placeholder="Ex : Coach de Vie Certifié"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                aria-required="true"
              />
            </div>

            <div>
              <label for="introduction" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Introduction <span aria-hidden="true" class="text-red-400">*</span></label
              >
              <textarea
                id="introduction"
                formControlName="introduction"
                rows="4"
                placeholder="Décrivez votre accompagnement en quelques phrases..."
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
                aria-required="true"
              ></textarea>
            </div>
          </div>
        </section>

        <!-- Section liste -->
        <section class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="bg-linear-to-r from-slate-600 to-slate-500 px-6 py-4 flex items-center gap-3">
            <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <app-icon name="sliders" size="md" />
            </div>
            <div>
              <h3 class="text-white font-semibold">Points clés</h3>
              <p class="text-white/80 text-xs">Les bénéfices et avantages de cet accompagnement</p>
            </div>
          </div>

          <div class="p-6 space-y-5">
            <div>
              <label for="sectionTitle" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Titre de section</label
              >
              <input
                id="sectionTitle"
                type="text"
                formControlName="sectionTitle"
                placeholder="Ex : Pourquoi faire appel à mes services ?"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
              />
            </div>

            <!-- Items -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-sm font-medium text-slate-700">Éléments</label>
                <button
                  type="button"
                  (click)="addItem()"
                  class="inline-flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-medium transition-colors cursor-pointer"
                >
                  <app-icon name="check" size="xs" />
                  Ajouter
                </button>
              </div>

              <div class="space-y-3">
                @for (item of itemsArray.controls; track $index; let i = $index) {
                  <div
                    class="group relative bg-slate-50 hover:bg-slate-100/80 rounded-xl p-4 transition-colors border border-slate-100"
                    [formGroup]="item"
                  >
                    <!-- Numéro -->
                    <div class="flex items-start gap-4">
                      <span
                        class="shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center mt-1"
                      >
                        {{ i + 1 }}
                      </span>

                      <div class="grow space-y-2">
                        <input
                          type="text"
                          formControlName="title"
                          placeholder="Titre (optionnel)"
                          class="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                        />
                        <textarea
                          formControlName="description"
                          rows="2"
                          placeholder="Description *"
                          class="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
                        ></textarea>
                      </div>

                      <div class="flex flex-col gap-0.5 shrink-0">
                        @if (i > 0) {
                          <button
                            type="button"
                            (click)="moveItem(i, -1)"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-all cursor-pointer"
                            aria-label="Monter"
                          >
                            <app-icon name="chevron-up" size="sm" />
                          </button>
                        }
                        @if (i < itemsArray.length - 1) {
                          <button
                            type="button"
                            (click)="moveItem(i, 1)"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-all cursor-pointer"
                            aria-label="Descendre"
                          >
                            <app-icon name="chevron-down" size="sm" />
                          </button>
                        }
                        <button
                          type="button"
                          (click)="removeItem(i)"
                          class="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                          aria-label="Supprimer"
                        >
                          <app-icon name="trash-2" size="sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-8 text-slate-400 text-sm">
                    Aucun élément. Cliquez sur « Ajouter » pour commencer.
                  </div>
                }
              </div>
            </div>

            <div>
              <label for="extraText" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Texte complémentaire</label
              >
              <textarea
                id="extraText"
                formControlName="extraText"
                rows="2"
                placeholder="Un texte additionnel sous la liste (optionnel)"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </section>

        <!-- Image -->
        <section class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div
            class="bg-linear-to-r from-violet-500 to-violet-400 px-6 py-4 flex items-center gap-3"
          >
            <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <app-icon name="image" size="md" />
            </div>
            <div>
              <h3 class="text-white font-semibold">Image</h3>
              <p class="text-white/80 text-xs">L'illustration principale de la page</p>
            </div>
          </div>

          <div class="p-6 space-y-5">
            <app-image-dropzone
              [currentImageUrl]="currentImageUrl()"
              [isUploading]="isUploadingImage()"
              (fileSelected)="onImageSelected($event)"
            />

            <div>
              <label for="imageAlt" class="block text-sm font-medium text-slate-700 mb-1.5"
                >Description de l'image
                <span aria-hidden="true" class="text-red-400">*</span></label
              >
              <input
                id="imageAlt"
                type="text"
                formControlName="imageAlt"
                placeholder="Ex : Séance de coaching de vie"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                aria-required="true"
              />
              <p class="text-xs text-slate-400 mt-1">
                Important pour l'accessibilité et le référencement
              </p>
            </div>
          </div>
        </section>
      </form>

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
            (click)="save()"
            [disabled]="form.invalid || isSaving()"
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
              Enregistrer
            }
          </button>
        </div>
      </div>
    }
  `,
})
export class DashboardContentEdit {
  private readonly getPageContent = inject(GetPageContentUseCase);
  private readonly updatePageContent = inject(UpdatePageContentUseCase);
  private readonly uploadImage = inject(UploadImageUseCase);
  readonly slug = input.required<string>();

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isUploadingImage = signal(false);
  protected readonly saveSuccess = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly currentImageUrl = signal<string | null>(null);
  private _pendingImageFile = signal<File | null>(null);

  protected readonly form = new FormGroup<PageFormShape>({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    introduction: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    sectionTitle: new FormControl('', { nonNullable: true }),
    items: new FormArray<ItemFormGroup>([]),
    extraText: new FormControl('', { nonNullable: true }),
    imageAlt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly pageTitle = computed(() => {
    const s = this.slug() as PageSlug;
    return DEFAULT_PAGES[s]?.title ?? 'Édition de page';
  });

  protected readonly headerGradient = computed(() => {
    const s = this.slug();
    const colors = PAGE_COLORS[s] ?? { from: 'from-brand-500', to: 'to-brand-400' };
    return `bg-gradient-to-r ${colors.from} ${colors.to}`;
  });

  protected readonly pageIcon = computed(() => {
    return PAGE_ICONS[this.slug()] ?? 'pencil';
  });

  protected get itemsArray(): FormArray<ItemFormGroup> {
    return this.form.controls.items;
  }

  constructor() {
    effect(() => {
      const s = this.slug() as PageSlug;
      if (!s) return;
      this.loadContent(s);
    });
  }

  private loadContent(slug: PageSlug): void {
    this.isLoading.set(true);
    const fallback = DEFAULT_PAGES[slug];

    this.getPageContent.execute(slug).subscribe((page) => {
      const content = page ?? fallback;
      this.form.patchValue({
        title: content.title,
        introduction: content.introduction,
        sectionTitle: content.sectionTitle,
        extraText: content.extraText,
        imageAlt: content.imageAlt,
      });

      this.itemsArray.clear();
      for (const item of content.items) {
        this.itemsArray.push(this.createItemGroup(item));
      }

      this.currentImageUrl.set(content.imageUrl || null);
      this.isLoading.set(false);
    });
  }

  private createItemGroup(item: PageContentItem = { title: '', description: '' }): ItemFormGroup {
    return new FormGroup({
      title: new FormControl(item.title, { nonNullable: true }),
      description: new FormControl(item.description, {
        nonNullable: true,
        validators: [Validators.required],
      }),
    });
  }

  protected addItem(): void {
    this.itemsArray.push(this.createItemGroup());
  }

  protected removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  protected moveItem(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.itemsArray.length) return;

    const current = this.itemsArray.at(index);
    this.itemsArray.removeAt(index);
    this.itemsArray.insert(target, current);
  }

  protected onImageSelected(file: File): void {
    this._pendingImageFile.set(file);
  }

  protected save(): void {
    if (this.form.invalid) return;

    const slug = this.slug() as PageSlug;
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    const pendingFile = this._pendingImageFile();
    if (pendingFile) {
      this.isUploadingImage.set(true);
      const path = `pages/${slug}/${Date.now()}-${pendingFile.name}`;
      this.uploadImage.execute(pendingFile, path).subscribe({
        next: (result) => {
          this.isUploadingImage.set(false);
          this._pendingImageFile.set(null);
          this.currentImageUrl.set(result.publicUrl);
          this.saveContent(slug, result.publicUrl);
        },
        error: () => {
          this.isUploadingImage.set(false);
          this.isSaving.set(false);
          this.saveError.set("Erreur lors de l'upload de l'image.");
        },
      });
    } else {
      this.saveContent(slug, this.currentImageUrl() ?? undefined);
    }
  }

  private saveContent(slug: PageSlug, imageUrl?: string): void {
    const formValue = this.form.getRawValue();
    this.updatePageContent
      .execute(slug, {
        title: formValue.title,
        introduction: formValue.introduction,
        sectionTitle: formValue.sectionTitle,
        items: formValue.items,
        extraText: formValue.extraText,
        imageUrl: imageUrl ?? '',
        imageAlt: formValue.imageAlt,
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.saveSuccess.set(true);
          setTimeout(() => this.saveSuccess.set(false), 4000);
        },
        error: () => {
          this.isSaving.set(false);
          this.saveError.set('Erreur lors de la sauvegarde du contenu.');
        },
      });
  }
}
