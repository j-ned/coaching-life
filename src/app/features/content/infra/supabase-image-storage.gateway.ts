import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { ImageStorageGateway } from '../domain/gateways/image-storage.gateway';
import type { ImageUploadResult } from '../domain/models/image-upload.model';
import { Supabase } from '../../../core/services/supabase/supabase';

const BUCKET = 'coaching-img';

@Injectable()
export class SupabaseImageStorageGateway extends ImageStorageGateway {
  private readonly supabase = inject(Supabase);

  upload(file: File, path: string): Observable<ImageUploadResult> {
    return from(
      this.supabase.client.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('[Storage] Upload failed:', error.message, error);
          throw error;
        }
        const publicUrl = this.getPublicUrl(data.path);
        return { publicUrl, path: data.path };
      }),
    );
  }

  delete(path: string): Observable<void> {
    return from(
      this.supabase.client.storage
        .from(BUCKET)
        .remove([path])
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.client.storage
      .from(BUCKET)
      .getPublicUrl(path);
    return data.publicUrl;
  }
}
