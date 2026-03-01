import type { PageContent } from '../domain/models/page-content.model';
import type {
  HeroSettings,
  HomeServicesSettings,
  HomeCTASettings,
} from '../domain/models/site-settings.model';

export class PageContentBuilder {
  private entity: PageContent = {
    id: 'page-001',
    slug: 'life-coach',
    title: 'Coaching de Vie',
    introduction: 'Découvrez notre approche unique du coaching de vie.',
    sectionTitle: 'Nos Services',
    items: [
      { title: 'Confiance en soi', description: 'Travaillez votre confiance.' },
      { title: 'Gestion du stress', description: 'Apprenez à gérer votre stress.' },
    ],
    extraText: 'Contactez-nous pour en savoir plus.',
    imageUrl: 'https://example.com/life-coach.jpg',
    imageAlt: 'Séance de coaching de vie',
    updatedAt: '2026-02-28T10:00:00.000Z',
  };

  private constructor() {}

  static default(): PageContentBuilder {
    return new PageContentBuilder();
  }

  with<K extends keyof PageContent>(key: K, value: PageContent[K]): PageContentBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): PageContent {
    return { ...this.entity };
  }
}

export class HeroSettingsBuilder {
  private entity: HeroSettings = {
    title: 'Bienvenue chez Coaching Life',
    subtitle: 'Votre parcours de transformation commence ici.',
    ctaPrimaryText: 'Prendre rendez-vous',
    ctaPrimaryLink: '/booking',
    ctaSecondaryText: 'En savoir plus',
    ctaSecondaryLink: '/life-coach',
    imageUrl: 'https://example.com/hero.jpg',
    imageAlt: 'Coaching Life hero',
  };

  private constructor() {}

  static default(): HeroSettingsBuilder {
    return new HeroSettingsBuilder();
  }

  with<K extends keyof HeroSettings>(key: K, value: HeroSettings[K]): HeroSettingsBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): HeroSettings {
    return { ...this.entity };
  }
}

export class HomeServicesSettingsBuilder {
  private entity: HomeServicesSettings = {
    badge: 'Nos Services',
    title: 'Ce que nous proposons',
    subtitle: 'Découvrez nos différentes approches de coaching.',
  };

  private constructor() {}

  static default(): HomeServicesSettingsBuilder {
    return new HomeServicesSettingsBuilder();
  }

  with<K extends keyof HomeServicesSettings>(
    key: K,
    value: HomeServicesSettings[K],
  ): HomeServicesSettingsBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): HomeServicesSettings {
    return { ...this.entity };
  }
}

export class HomeCTASettingsBuilder {
  private entity: HomeCTASettings = {
    badge: 'Prêt à commencer ?',
    title: 'Réservez votre séance',
    subtitle: 'Faites le premier pas vers votre transformation.',
  };

  private constructor() {}

  static default(): HomeCTASettingsBuilder {
    return new HomeCTASettingsBuilder();
  }

  with<K extends keyof HomeCTASettings>(key: K, value: HomeCTASettings[K]): HomeCTASettingsBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): HomeCTASettings {
    return { ...this.entity };
  }
}
