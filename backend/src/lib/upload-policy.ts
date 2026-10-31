import { randomUUID } from 'node:crypto';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type ImageType = { readonly ext: string; readonly mime: string };

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

// Liste blanche raster vérifiée sur les octets magiques : le nom et le type MIME envoyés par
// le client ne font pas foi. Pas de SVG (script exécutable sur l'origine du site).
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }
  if (ascii(bytes, 0, 8) === '\x89PNG\r\n\x1a\n') {
    return { ext: '.png', mime: 'image/png' };
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return { ext: '.webp', mime: 'image/webp' };
  }
  if (ascii(bytes, 4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(bytes, 8, 12))) {
    return { ext: '.avif', mime: 'image/avif' };
  }
  return null;
}

// Clé S3 : chemin demandé assaini (caractères sûrs, pas de segment vide ni `..`) et extension
// imposée par le type détecté.
export function buildStorageKey(path: string, ext: string, id: () => string = randomUUID): string {
  const segments = path
    .replace(/\.[^./]*$/, '')
    .split('/')
    .map((segment) => segment.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean);
  return `${segments.length ? segments.join('/') : id()}${ext}`;
}
