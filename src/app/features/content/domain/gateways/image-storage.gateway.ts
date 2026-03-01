import type { Observable } from 'rxjs';
import type { ImageUploadResult } from '../models/image-upload.model';

export abstract class ImageStorageGateway {
  abstract upload(file: File, path: string): Observable<ImageUploadResult>;
  abstract delete(path: string): Observable<void>;
  abstract getPublicUrl(path: string): string;
}
