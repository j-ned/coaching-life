import type { PageContent, PageSlug } from './page-content.model';
import type { HeroSettings, HomeCTASettings, HomeServicesSettings } from './site-settings.model';

export const DEFAULT_PAGES: Record<PageSlug, PageContent> = {
  'life-coach': {
    id: '',
    slug: 'life-coach',
    title: 'Coach de Vie Certifié',
    introduction:
      "En tant que coach de vie certifiée, je vous accompagne dans vos transitions professionnelles et personnelles. Mon approche est centrée sur l'écoute active, la bienveillance, et la mise en place d'actions concrètes pour transformer votre quotidien.",
    sectionTitle: 'Pourquoi faire appel à mes services ?',
    items: [
      {
        title: 'Dépasser un blocage',
        description: "Identifier les croyances limitantes qui vous empêchent d'avancer.",
      },
      {
        title: 'Retrouver du sens',
        description: 'Clarifier vos objectifs réels et retrouver la motivation profonde.',
      },
      {
        title: 'Améliorer la confiance en soi',
        description: "Réapprendre à s'estimer et affirmer ses choix sereinement.",
      },
      {
        title: 'Gestion du stress',
        description: 'Apprendre à accueillir et réguler ses émotions dans les phases difficiles.',
      },
    ],
    extraText: '',
    imageUrl: '',
    imageAlt: 'Séance de coaching de vie',
    updatedAt: '',
  },
  'personal-development': {
    id: '',
    slug: 'personal-development',
    title: 'Développement Personnel',
    introduction:
      "Le développement personnel est un voyage continu vers l'épanouissement. Apprenez à mieux vous connaître, à identifier vos forces, vos valeurs profondes, et à construire une vie plus alignée avec vos aspirations.",
    sectionTitle: "Bénéfices de l'accompagnement",
    items: [
      { title: '', description: 'Alignement entre vos actions et vos valeurs.' },
      { title: '', description: 'Découverte et exploitation de vos talents naturels.' },
      { title: '', description: 'Création de nouvelles habitudes positives et durables.' },
      { title: '', description: 'Meilleure appréhension des changements de vie.' },
    ],
    extraText: 'Investir en soi-même est le meilleur investissement que vous puissiez faire.',
    imageUrl: '',
    imageAlt: 'Carnet de développement personnel',
    updatedAt: '',
  },
  'equine-coaching': {
    id: '',
    slug: 'equine-coaching',
    title: 'Coaching facilité avec le cheval',
    introduction:
      'Le cheval est un miroir puissant, authentique et sans jugement de nos émotions et de notre posture. À travers des exercices spécifiques au sol, découvrez une approche expérientielle unique pour développer votre intelligence émotionnelle et votre ancrage.',
    sectionTitle: 'Ce que le cheval vous apprend :',
    items: [
      {
        title: 'Lâcher prise et ancrage',
        description: "Vivre l'instant présent et se déconnecter du mental.",
      },
      {
        title: 'Communication non verbale',
        description: "Prendre conscience de l'impact de sa posture corporelle.",
      },
      {
        title: 'Authenticité & Leadership',
        description: 'Développer un leadership bienveillant et congruent.',
      },
    ],
    extraText:
      "Aucune connaissance ou pratique préalable de l'équitation n'est requise. Tout le travail s'effectue au sol, en toute sécurité.",
    imageUrl: '',
    imageAlt: "Séance d'équicoaching",
    updatedAt: '',
  },
  'neuroatypical-parents': {
    id: '',
    slug: 'neuroatypical-parents',
    title: "Parents d'enfants neuroatypiques",
    introduction:
      "Accompagner un enfant atypique (TDAH, TSA, DYS, HPI) est un véritable parcours du combattant. Je vous propose un espace d'écoute sécurisant, bienveillant et dénué de tout jugement.",
    sectionTitle: 'Un accompagnement dédié pour :',
    items: [
      {
        title: 'Apaiser la charge mentale',
        description: 'Trouver des espaces de répit et exprimer vos difficultés sans tabou.',
      },
      {
        title: 'Trouver des ressources adaptées',
        description:
          'Identifier les fonctionnements propres à votre enfant et à votre dynamique familiale.',
      },
      {
        title: 'Restaurer le lien enfant-parent',
        description:
          "Sortir de l'opposition constante et ramener de la joie et de la complicité au sein du foyer.",
      },
    ],
    extraText: '',
    imageUrl: '',
    imageAlt: "Soutien aux parents d'enfants neuroatypiques",
    updatedAt: '',
  },
};

export const DEFAULT_HERO: HeroSettings = {
  title: 'Révélez votre plein potentiel intérieur',
  subtitle:
    "Un accompagnement sur-mesure pour vous aider à franchir un cap, que ce soit en développement personnel, coaching de vie, ou en tant que parent d'enfant atypique.",
  ctaPrimaryText: 'Prendre rendez-vous',
  ctaPrimaryLink: 'contact',
  ctaSecondaryText: 'Découvrir les services',
  ctaSecondaryLink: 'services',
  imageUrl: '',
  imageAlt: 'Cabinet de coaching apaisant',
};

export const DEFAULT_HOME_SERVICES: HomeServicesSettings = {
  badge: 'MES ACCOMPAGNEMENTS',
  title: 'Un accompagnement adapté à chaque besoin',
  subtitle: "Découvrez mes spécialités et trouvez l'accompagnement qui vous correspond.",
};

export const DEFAULT_HOME_CTA: HomeCTASettings = {
  badge: "PASSEZ A L'ACTION",
  title: 'Prêt(e) à commencer ?',
  subtitle: 'Réservez une séance ou envoyez-moi un message pour échanger sur vos besoins.',
};
