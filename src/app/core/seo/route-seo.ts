export type PageSeo = {
  readonly title: string;
  readonly description: string;
  readonly path: string;
};

export const ROUTE_SEO = {
  home: {
    title: 'Coach de Vie, Coaching Équin & Accompagnement Parental',
    description:
      "Coaching Life vous accompagne avec des séances de coaching de vie certifié, coaching équin et soutien aux parents d'enfants neuroatypiques. Révélez votre plein potentiel.",
    path: '/',
  },
  'life-coach': {
    title: 'Coach de Vie Certifié',
    description:
      'Coaching de vie certifié pour dépasser vos blocages, retrouver du sens et gagner en confiance. Un accompagnement bienveillant et sur mesure.',
    path: '/life-coach',
  },
  'personal-development': {
    title: 'Développement Personnel',
    description:
      'Accompagnement en développement personnel : alignez vos actions sur vos valeurs, révélez vos talents et installez des habitudes positives durables.',
    path: '/personal-development',
  },
  'equine-coaching': {
    title: 'Coaching Équin',
    description:
      'Coaching facilité avec le cheval : lâcher-prise, ancrage, communication non verbale et leadership authentique. Une approche corporelle et puissante.',
    path: '/equine-coaching',
  },
  'neuroatypical-parents': {
    title: "Parents d'Enfants Neuroatypiques",
    description:
      "Accompagnement dédié aux parents d'enfants neuroatypiques : apaiser la charge mentale, trouver des ressources adaptées et restaurer le lien familial.",
    path: '/neuroatypical-parents',
  },
} as const satisfies Record<string, PageSeo>;
