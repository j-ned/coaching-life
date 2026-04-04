import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });
import { db, users, pages, site_settings } from './index.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // ─── Admin user ───────────────────────────────────────────────────────────
  const adminEmail = process.env['ADMIN_EMAIL'] ?? 'admin@coaching-life.fr';
  const adminPassword = process.env['ADMIN_PASSWORD'] ?? 'changeme';
  const hash = await bcrypt.hash(adminPassword, 12);

  await db
    .insert(users)
    .values({ email: adminEmail, name: 'Admin', password: hash, role: 'admin' })
    .onConflictDoNothing();
  console.log(`✓ Admin user: ${adminEmail}`);

  // ─── Pages ────────────────────────────────────────────────────────────────
  await db
    .insert(pages)
    .values([
      {
        slug: 'life-coach',
        title: 'Coach de Vie Certifié',
        introduction:
          "En tant que coach de vie certifiée, je vous accompagne dans vos transitions professionnelles et personnelles. Mon approche est centrée sur l'écoute active, la bienveillance, et la mise en place d'actions concrètes pour transformer votre quotidien.",
        section_title: 'Pourquoi faire appel à mes services ?',
        items: [
          { title: 'Dépasser un blocage', description: "Identifier les croyances limitantes qui vous empêchent d'avancer." },
          { title: 'Retrouver du sens', description: 'Clarifier vos objectifs réels et retrouver la motivation profonde.' },
          { title: 'Améliorer la confiance en soi', description: "Réapprendre à s'estimer et affirmer ses choix sereinement." },
          { title: 'Gestion du stress', description: 'Apprendre à accueillir et réguler ses émotions dans les phases difficiles.' },
        ],
        extra_text: '',
        image_url: null,
        image_alt: 'Séance de coaching de vie',
      },
      {
        slug: 'personal-development',
        title: 'Développement Personnel',
        introduction:
          "Le développement personnel est un voyage continu vers l'épanouissement. Apprenez à mieux vous connaître, à identifier vos forces, vos valeurs profondes, et à construire une vie plus alignée avec vos aspirations.",
        section_title: "Bénéfices de l'accompagnement",
        items: [
          { title: '', description: 'Alignement entre vos actions et vos valeurs.' },
          { title: '', description: 'Découverte et exploitation de vos talents naturels.' },
          { title: '', description: 'Création de nouvelles habitudes positives et durables.' },
          { title: '', description: 'Meilleure appréhension des changements de vie.' },
        ],
        extra_text: 'Investir en soi-même est le meilleur investissement que vous puissiez faire.',
        image_url: null,
        image_alt: 'Carnet de développement personnel',
      },
      {
        slug: 'equine-coaching',
        title: 'Coaching facilité avec le cheval',
        introduction:
          "Le cheval est un miroir puissant, authentique et sans jugement de nos émotions et de notre posture. À travers des exercices spécifiques au sol, découvrez une approche expérientielle unique pour développer votre intelligence émotionnelle et votre ancrage.",
        section_title: 'Ce que le cheval vous apprend :',
        items: [
          { title: 'Lâcher prise et ancrage', description: "Vivre l'instant présent et se déconnecter du mental." },
          { title: 'Communication non verbale', description: "Prendre conscience de l'impact de sa posture corporelle." },
          { title: 'Authenticité & Leadership', description: 'Développer un leadership bienveillant et congruent.' },
        ],
        extra_text:
          "Aucune connaissance ou pratique préalable de l'équitation n'est requise. Tout le travail s'effectue au sol, en toute sécurité.",
        image_url: null,
        image_alt: "Séance d'équicoaching",
      },
      {
        slug: 'neuroatypical-parents',
        title: "Parents d'enfants neuroatypiques",
        introduction:
          "Accompagner un enfant atypique (TDAH, TSA, DYS, HPI) est un véritable parcours du combattant. Je vous propose un espace d'écoute sécurisant, bienveillant et dénué de tout jugement.",
        section_title: 'Un accompagnement dédié pour :',
        items: [
          { title: 'Apaiser la charge mentale', description: 'Trouver des espaces de répit et exprimer vos difficultés sans tabou.' },
          { title: 'Trouver des ressources adaptées', description: 'Identifier les fonctionnements propres à votre enfant et à votre dynamique familiale.' },
          { title: 'Restaurer le lien enfant-parent', description: "Sortir de l'opposition constante et ramener de la joie et de la complicité au sein du foyer." },
        ],
        extra_text: '',
        image_url: null,
        image_alt: "Soutien aux parents d'enfants neuroatypiques",
      },
    ])
    .onConflictDoNothing();
  console.log('✓ Pages seeded');

  // ─── Site settings ────────────────────────────────────────────────────────
  await db
    .insert(site_settings)
    .values([
      {
        key: 'home_hero',
        value: {
          title: 'Révélez votre plein potentiel intérieur',
          subtitle:
            "Un accompagnement sur-mesure pour vous aider à franchir un cap, que ce soit en développement personnel, coaching de vie, ou en tant que parent d'enfant atypique.",
          ctaPrimaryText: 'Prendre rendez-vous',
          ctaPrimaryLink: 'contact',
          ctaSecondaryText: 'Découvrir les services',
          ctaSecondaryLink: 'services',
          imageUrl: '',
          imageAlt: 'Cabinet de coaching apaisant',
        },
      },
      {
        key: 'home_services',
        value: {
          badge: 'MES ACCOMPAGNEMENTS',
          title: 'Un accompagnement adapté à chaque besoin',
          subtitle: "Découvrez mes spécialités et trouvez l'accompagnement qui vous correspond.",
        },
      },
      {
        key: 'home_cta',
        value: {
          badge: "PASSEZ A L'ACTION",
          title: 'Prêt(e) à commencer ?',
          subtitle: 'Réservez une séance ou envoyez-moi un message pour échanger sur vos besoins.',
        },
      },
    ])
    .onConflictDoNothing();
  console.log('✓ Site settings seeded');

  console.log('✅ Done');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
