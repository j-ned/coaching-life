import { toMessage, toSupabaseMessageInsert } from './message.adapter';
import type { SupabaseMessageRow } from './message.adapter';
import { SendMessageDataBuilder } from '../test-utils/message.builder';

describe('message.adapter', () => {
  describe('toMessage', () => {
    it.each([
      {
        label: 'un message complet',
        row: {
          id: 'msg-001',
          sender_name: 'Jean Martin',
          sender_email: 'jean@email.fr',
          subject: 'life_coach',
          content: 'Bonjour, je souhaite un coaching.',
          status: 'unread',
          created_at: '2026-03-01T14:30:00.000Z',
        } satisfies SupabaseMessageRow,
        expected: {
          id: 'msg-001',
          senderName: 'Jean Martin',
          senderEmail: 'jean@email.fr',
          subject: 'life_coach',
          content: 'Bonjour, je souhaite un coaching.',
          status: 'unread',
          createdAt: '2026-03-01T14:30:00.000Z',
        },
      },
      {
        label: 'un message sans sujet',
        row: {
          id: 'msg-002',
          sender_name: 'Sophie Lefèvre',
          sender_email: 'sophie@email.fr',
          subject: '',
          content: 'Question générale.',
          status: 'read',
          created_at: '2026-02-15T08:00:00.000Z',
        } satisfies SupabaseMessageRow,
        expected: {
          id: 'msg-002',
          senderName: 'Sophie Lefèvre',
          senderEmail: 'sophie@email.fr',
          subject: '',
          content: 'Question générale.',
          status: 'read',
          createdAt: '2026-02-15T08:00:00.000Z',
        },
      },
    ])('should convert $label from snake_case to camelCase', ({ row, expected }) => {
      // When
      const result = toMessage(row);

      // Then
      expect(result).toEqual(expected);
    });
  });

  describe('toSupabaseMessageInsert', () => {
    it('should convert send data to snake_case with unread status', () => {
      // Given
      const data = SendMessageDataBuilder.default()
        .with('name', 'Claire Petit')
        .with('email', 'claire@email.fr')
        .with('subject', 'equine')
        .with('message', 'Intéressée par le coaching équin.')
        .build();

      // When
      const result = toSupabaseMessageInsert(data);

      // Then
      expect(result).toEqual({
        sender_name: 'Claire Petit',
        sender_email: 'claire@email.fr',
        subject: 'equine',
        content: 'Intéressée par le coaching équin.',
        status: 'unread',
      });
    });
  });
});
