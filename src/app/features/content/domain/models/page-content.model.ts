export type PageSlug = 'life-coach' | 'personal-development' | 'equine-coaching' | 'neuroatypical-parents';

export type PageContentItem = {
  readonly title: string;
  readonly description: string;
};

export type PageContent = {
  readonly id: string;
  readonly slug: PageSlug;
  readonly title: string;
  readonly introduction: string;
  readonly sectionTitle: string;
  readonly items: readonly PageContentItem[];
  readonly extraText: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly updatedAt: string;
};
