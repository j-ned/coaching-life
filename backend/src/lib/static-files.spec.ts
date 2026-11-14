import { describe, expect, it } from 'vitest';
import { IMMUTABLE, isFilePath, staticCacheControl } from './static-files.js';

describe('staticCacheControl', () => {
  it.each(['/main-AbCdEf12.js', '/chunk-zusXQg_7.js', '/chunk-0uwEYm9E.js', '/polyfills-AB-cd_12.js', '/styles-ABCDEFGH.css'])(
    'met en cache sans limite le bundle à empreinte %s',
    (path) => {
      expect(staticCacheControl(path)).toBe(IMMUTABLE);
    },
  );

  it.each([
    '/index.html',
    '/index.csr.html',
    '/life-coach/index.html',
    '/favicon.ico',
    '/icons/sprite.svg',
    '/screen/hero-dark.png',
    '/robots.txt',
    '/main.js',
    '/main-ABC.js',
    '/assets/main-ABCDEFGH.js',
    '/main-ABCDEFGH.js.map',
  ])('fait revalider %s, dont le nom ne change pas avec son contenu', (path) => {
    expect(staticCacheControl(path)).toBe('no-cache');
  });
});

describe('isFilePath', () => {
  it.each(['/main-OLDHASH1.js', '/absent.css', '/icons/absent.svg', '/favicon.ico'])(
    '%s désigne un fichier : absent, il répond 404 au lieu de la coquille HTML',
    (path) => {
      expect(isFilePath(path)).toBe(true);
    },
  );

  it.each(['/', '/life-coach', '/dashboard', '/dashboard/rendez-vous/42', '/life-coach/'])(
    '%s est une route de l’application',
    (path) => {
      expect(isFilePath(path)).toBe(false);
    },
  );
});
