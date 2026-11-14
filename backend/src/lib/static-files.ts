// Politique HTTP des fichiers du front servis par le serveur Node (hors Vercel).

export const IMMUTABLE = 'public, max-age=31536000, immutable';

// Bundles d'Angular nommés par leur empreinte de contenu, à la racine du build.
const FINGERPRINTED = /^\/(?:main|chunk|polyfills|styles)-[A-Za-z0-9_-]{8}\.(?:js|css)$/;

// Un nom à empreinte change avec le contenu : il se garde sans limite. Tout autre fichier (HTML qui
// référence les bundles du déploiement, icônes, images) est revalidé à chaque fois.
export function staticCacheControl(path: string): string {
  return FINGERPRINTED.test(path) ? IMMUTABLE : 'no-cache';
}

// Un chemin qui finit par une extension désigne un fichier, pas une route de l'application : absent,
// il doit répondre 404. Sinon un ancien bundle demandé après un déploiement recevrait la coquille
// HTML, que le navigateur refuserait d'exécuter comme script.
export function isFilePath(path: string): boolean {
  return /\.[A-Za-z0-9]+$/.test(path);
}
