import { describe, expect, it } from 'vitest';
import { buildStorageKey, detectImageType } from './upload-policy.js';

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === 'string' ? [...part].map((char) => char.charCodeAt(0)) : part,
    ),
  );

describe('detectImageType', () => {
  it.each([
    { label: 'JPEG', input: bytes([0xff, 0xd8, 0xff, 0xe0]), ext: '.jpg' },
    { label: 'PNG', input: bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a]), ext: '.png' },
    { label: 'WebP', input: bytes('RIFF', [0, 0, 0, 0], 'WEBP'), ext: '.webp' },
    { label: 'AVIF', input: bytes([0, 0, 0, 0x1c], 'ftypavif'), ext: '.avif' },
  ])('reconnaît un $label', ({ input, ext }) => {
    expect(detectImageType(input)?.ext).toBe(ext);
  });

  it.each([
    { label: 'SVG', input: bytes('<svg xmlns="http://www.w3.org/2000/svg">') },
    { label: 'HTML', input: bytes('<!doctype html><script>') },
    { label: 'vide', input: new Uint8Array() },
  ])('refuse un contenu $label', ({ input }) => {
    expect(detectImageType(input)).toBeNull();
  });
});

describe('buildStorageKey', () => {
  it("impose l'extension du type détecté", () => {
    expect(buildStorageKey('home/hero-1.svg', '.png')).toBe('home/hero-1.png');
  });

  it('assainit les caractères et neutralise les segments `..`', () => {
    expect(buildStorageKey('../pages/life coach/été 2026.jpg', '.jpg')).toBe(
      'pages/life-coach/t-2026.jpg',
    );
  });

  it('génère un identifiant quand le chemin est vide', () => {
    expect(buildStorageKey('', '.webp', () => 'abc')).toBe('abc.webp');
  });
});
