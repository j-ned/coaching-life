import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

@Component({
  selector: 'app-image-dropzone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'block' },
  template: `
    <div
      class="relative border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer"
      [class.border-brand-400]="isDragOver()"
      [class.bg-brand-50]="isDragOver()"
      [class.border-slate-300]="!isDragOver()"
      [class.hover:border-brand-300]="!isDragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="triggerFileInput()"
      role="button"
      tabindex="0"
      [attr.aria-label]="currentImageUrl() ? 'Changer l\\'image' : 'Ajouter une image'"
      (keydown.enter)="triggerFileInput()"
      (keydown.space)="triggerFileInput(); $event.preventDefault()"
    >
      @if (isUploading()) {
        <div class="flex flex-col items-center gap-3 py-4">
          <div
            class="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"
          ></div>
          <p class="text-sm text-slate-500">Upload en cours...</p>
        </div>
      } @else if (previewUrl() || currentImageUrl()) {
        <div class="relative group">
          <img
            [src]="previewUrl() || currentImageUrl()"
            [alt]="'Aperçu'"
            class="max-h-48 mx-auto rounded-lg object-cover"
          />
          <div
            class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <span class="text-white text-sm font-medium">Changer l'image</span>
          </div>
        </div>
      } @else {
        <div class="flex flex-col items-center gap-3 py-4">
          <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <app-icon name="image" size="lg" class="text-slate-500" />
          </div>
          <div>
            <p class="text-sm font-medium text-slate-700">Glissez-déposez une image ici</p>
            <p class="text-xs text-slate-500 mt-1">
              ou cliquez pour parcourir (JPEG, PNG, WebP, AVIF — max {{ maxSizeMb }} Mo)
            </p>
          </div>
        </div>
      }

      @if (errorMessage()) {
        <p class="mt-2 text-sm text-red-500" role="alert">{{ errorMessage() }}</p>
      }

      <input
        #fileInputRef
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        class="hidden"
        (change)="onFileSelected($event)"
      />
    </div>
  `,
})
export class ImageDropzone {
  readonly currentImageUrl = input<string | null>(null);
  readonly isUploading = input(false);
  readonly fileSelected = output<File>();

  private readonly _fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInputRef');
  protected readonly isDragOver = signal(false);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly maxSizeMb = MAX_SIZE_MB;

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
    input.value = '';
  }

  protected triggerFileInput(): void {
    this._fileInputRef()?.nativeElement?.click();
  }

  private processFile(file: File): void {
    this.errorMessage.set(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.errorMessage.set('Format non supporté. Utilisez JPEG, PNG, WebP ou AVIF.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      this.errorMessage.set(`Le fichier dépasse la taille maximale de ${MAX_SIZE_MB} Mo.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);

    this.fileSelected.emit(file);
  }
}
