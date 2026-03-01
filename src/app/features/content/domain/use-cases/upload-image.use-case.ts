import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ImageStorageGateway } from '../gateways/image-storage.gateway';
import type { ImageUploadResult } from '../models/image-upload.model';

@Injectable({ providedIn: 'root' })
export class UploadImageUseCase {
  private readonly gateway = inject(ImageStorageGateway);

  execute(file: File, path: string): Observable<ImageUploadResult> {
    return this.gateway.upload(file, path);
  }
}
