// Build de la fonction Vercel : l'API en un seul fichier ESM.
// La sortie de `tsc` (un fichier par module, dépendances dans node_modules) fait lire à Node
// plusieurs centaines de fichiers à chaque démarrage à froid ; un bundle en charge un seul.
// Le build `tsc` (`pnpm build`) reste celui de l'image Docker.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/app.ts'],
  outfile: 'dist-vercel/app.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node26',
  // Liaison native facultative de `pg`, jamais installée : sans cela esbuild échoue à la résoudre.
  external: ['pg-native'],
  // Les dépendances CommonJS embarquées (pg, nodemailer…) appellent `require` : il n'existe pas en ESM.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: 'warning',
});
