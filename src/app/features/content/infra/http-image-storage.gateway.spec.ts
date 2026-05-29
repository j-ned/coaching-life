import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpImageStorageGateway } from './http-image-storage.gateway';
import type { ImageUploadResult } from '../domain/models/image-upload.model';

describe('HttpImageStorageGateway', () => {
  let gateway: HttpImageStorageGateway;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        HttpImageStorageGateway,
      ],
    });
    gateway = TestBed.inject(HttpImageStorageGateway);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('upload', () => {
    it('should POST a multipart form with file and path, then return the result', async () => {
      const file = new File(['content'], 'photo.png', { type: 'image/png' });
      const result: ImageUploadResult = {
        publicUrl: '/api/storage/files/images%2Fphoto.png',
        path: 'images/photo.png',
      };

      const promise = gateway.upload(file, 'images/photo.png');

      const req = httpMock.expectOne('/api/storage/upload');
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      const body = req.request.body as FormData;
      expect(body).toBeInstanceOf(FormData);
      expect(body.get('file')).toBe(file);
      expect(body.get('path')).toBe('images/photo.png');
      req.flush(result);

      await expect(promise).resolves.toEqual(result);
    });

    it('should reject when the upload fails (no catch in gateway)', async () => {
      const file = new File(['content'], 'photo.png', { type: 'image/png' });

      const promise = gateway.upload(file, 'images/photo.png');

      httpMock
        .expectOne('/api/storage/upload')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).rejects.toBeDefined();
    });
  });

  describe('delete', () => {
    it('should DELETE with the path in the body and credentials', async () => {
      const promise = gateway.delete('images/photo.png');

      const req = httpMock.expectOne('/api/storage/files');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toEqual({ path: 'images/photo.png' });
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('getPublicUrl', () => {
    it.each([
      {
        path: 'images/photo.png',
        expected: '/api/storage/files/images%2Fphoto.png',
      },
      {
        path: 'a b/c.jpg',
        expected: '/api/storage/files/a%20b%2Fc.jpg',
      },
    ])('should build an encoded public URL for "$path"', ({ path, expected }) => {
      expect(gateway.getPublicUrl(path)).toBe(expected);
    });
  });
});
