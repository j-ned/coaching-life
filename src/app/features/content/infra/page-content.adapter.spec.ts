import { toPageContent, toSupabasePageUpdate } from './page-content.adapter';
import type { SupabasePageRow } from './page-content.adapter';

describe('page-content.adapter', () => {
  describe('toPageContent', () => {
    it.each([
      {
        label: 'une page complète',
        row: {
          id: 'page-001',
          slug: 'life-coach',
          title: 'Coaching de Vie',
          introduction: 'Bienvenue dans notre espace coaching.',
          section_title: 'Nos Approches',
          items: [{ title: 'Confiance', description: 'Travaillez votre confiance.' }],
          extra_text: 'Contactez-nous.',
          image_url: 'https://example.com/img.jpg',
          image_alt: 'Coaching de vie',
          updated_at: '2026-02-28T10:00:00.000Z',
        } satisfies SupabasePageRow,
        expected: {
          id: 'page-001',
          slug: 'life-coach',
          title: 'Coaching de Vie',
          introduction: 'Bienvenue dans notre espace coaching.',
          sectionTitle: 'Nos Approches',
          items: [{ title: 'Confiance', description: 'Travaillez votre confiance.' }],
          extraText: 'Contactez-nous.',
          imageUrl: 'https://example.com/img.jpg',
          imageAlt: 'Coaching de vie',
          updatedAt: '2026-02-28T10:00:00.000Z',
        },
      },
      {
        label: 'une page avec champs null',
        row: {
          id: 'page-002',
          slug: 'equine-coaching',
          title: 'Coaching Équin',
          introduction: 'Découvrez le coaching équin.',
          section_title: 'Bienfaits',
          items: [],
          extra_text: null,
          image_url: null,
          image_alt: '',
          updated_at: '2026-01-15T08:00:00.000Z',
        } satisfies SupabasePageRow,
        expected: {
          id: 'page-002',
          slug: 'equine-coaching',
          title: 'Coaching Équin',
          introduction: 'Découvrez le coaching équin.',
          sectionTitle: 'Bienfaits',
          items: [],
          extraText: '',
          imageUrl: '',
          imageAlt: '',
          updatedAt: '2026-01-15T08:00:00.000Z',
        },
      },
    ])('should convert $label from snake_case to camelCase', ({ row, expected }) => {
      // When
      const result = toPageContent(row);

      // Then
      expect(result).toEqual(expected);
    });
  });

  describe('toSupabasePageUpdate', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('should convert only provided fields to snake_case', () => {
      // Given
      const data = { title: 'Nouveau Titre', introduction: 'Nouvelle intro' };

      // When
      const result = toSupabasePageUpdate(data);

      // Then
      expect(result).toEqual({
        title: 'Nouveau Titre',
        introduction: 'Nouvelle intro',
        updated_at: '2026-03-01T12:00:00.000Z',
      });
    });

    it('should include updated_at timestamp', () => {
      // When
      const result = toSupabasePageUpdate({ sectionTitle: 'Titre de section' });

      // Then
      expect(result['updated_at']).toBe('2026-03-01T12:00:00.000Z');
      expect(result['section_title']).toBe('Titre de section');
    });
  });
});
