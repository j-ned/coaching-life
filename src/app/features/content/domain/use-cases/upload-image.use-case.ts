import { Injectable, inject } from '@angular/core';
import { ImageStorageGateway } from '../gateways/image-storage.gateway';
import type { ImageUploadResult } from '../models/image-upload.model';

@Injectable({ providedIn: 'root' })
export class UploadImageUseCase {
  private readonly gateway = inject(ImageStorageGateway);

  execute(file: File, path: string): Promise<ImageUploadResult> {
    return this.gateway.upload(file, path);
  }
}
