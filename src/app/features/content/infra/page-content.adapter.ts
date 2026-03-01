import type { PageContent, PageContentItem } from '../domain/models/page-content.model';

export type SupabasePageRow = {
  id: string;
  slug: string;
  title: string;
  introduction: string;
  section_title: string;
  items: unknown[];
  extra_text: string | null;
  image_url: string | null;
  image_alt: string;
  updated_at: string;
};

export function toPageContent(raw: SupabasePageRow): PageContent {
  return {
    id: raw.id,
    slug: raw.slug as PageContent['slug'],
    title: raw.title,
    introduction: raw.introduction,
    sectionTitle: raw.section_title,
    items: (raw.items ?? []) as readonly PageContentItem[],
    extraText: raw.extra_text ?? '',
    imageUrl: raw.image_url ?? '',
    imageAlt: raw.image_alt,
    updatedAt: raw.updated_at,
  };
}

export function toSupabasePageUpdate(
  data: Partial<Omit<PageContent, 'id' | 'slug' | 'updatedAt'>>,
) {
  const result: Record<string, unknown> = {};
  if (data.title !== undefined) result['title'] = data.title;
  if (data.introduction !== undefined) result['introduction'] = data.introduction;
  if (data.sectionTitle !== undefined) result['section_title'] = data.sectionTitle;
  if (data.items !== undefined) result['items'] = data.items;
  if (data.extraText !== undefined) result['extra_text'] = data.extraText;
  if (data.imageUrl !== undefined) result['image_url'] = data.imageUrl;
  if (data.imageAlt !== undefined) result['image_alt'] = data.imageAlt;
  result['updated_at'] = new Date().toISOString();
  return result;
}
