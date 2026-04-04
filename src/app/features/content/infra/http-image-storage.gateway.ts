import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ImageStorageGateway } from '../domain/gateways/image-storage.gateway';
import type { ImageUploadResult } from '../domain/models/image-upload.model';
import { API_URL } from '../../../core/config.js';

const BASE = `${API_URL}/api/storage`;

@Injectable()
export class HttpImageStorageGateway implements ImageStorageGateway {
  private readonly http = inject(HttpClient);

  async upload(file: File, path: string): Promise<ImageUploadResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('path', path);
    return firstValueFrom(
      this.http.post<ImageUploadResult>(`${BASE}/upload`, form, { withCredentials: true }),
    );
  }

  async delete(path: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${BASE}/files`, {
        body: { path },
        withCredentials: true,
      }),
    );
  }

  getPublicUrl(path: string): string {
    return `${BASE}/files/${encodeURIComponent(path)}`;
  }
}
