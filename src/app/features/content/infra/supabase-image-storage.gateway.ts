import { Injectable, inject } from '@angular/core';
import { ImageStorageGateway } from '../domain/gateways/image-storage.gateway';
import type { ImageUploadResult } from '../domain/models/image-upload.model';
import { Supabase } from '../../../core/services/supabase/supabase';

const BUCKET = 'coaching-img';

@Injectable()
export class SupabaseImageStorageGateway implements ImageStorageGateway {
  private readonly supabase = inject(Supabase);

  async upload(file: File, path: string): Promise<ImageUploadResult> {
    const { data, error } = await this.supabase.client.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });
    if (error) {
      console.error('[Storage] Upload failed:', error.message, error);
      throw error;
    }
    const publicUrl = this.getPublicUrl(data.path);
    return { publicUrl, path: data.path };
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.supabase.client.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.client.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}
