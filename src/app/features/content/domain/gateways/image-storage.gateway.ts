import type { ImageUploadResult } from '../models/image-upload.model';

export abstract class ImageStorageGateway {
  abstract upload(file: File, path: string): Promise<ImageUploadResult>;
  abstract delete(path: string): Promise<void>;
  abstract getPublicUrl(path: string): string;
}
