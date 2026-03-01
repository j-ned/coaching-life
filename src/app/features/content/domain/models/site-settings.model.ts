export type HeroSettings = {
  readonly title: string;
  readonly subtitle: string;
  readonly ctaPrimaryText: string;
  readonly ctaPrimaryLink: string;
  readonly ctaSecondaryText: string;
  readonly ctaSecondaryLink: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
};

export type HomeServicesSettings = {
  readonly badge: string;
  readonly title: string;
  readonly subtitle: string;
};

export type HomeCTASettings = {
  readonly badge: string;
  readonly title: string;
  readonly subtitle: string;
};

export type SiteSettingKey = 'home_hero' | 'home_services' | 'home_cta';

export type SiteSettingValue = HeroSettings | HomeServicesSettings | HomeCTASettings;
