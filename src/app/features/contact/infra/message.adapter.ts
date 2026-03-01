import type { Message, SendMessageData } from '../domain/models/message.model';

export type SupabaseMessageRow = {
  id: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  content: string;
  status: string;
  created_at: string;
};

export function toMessage(raw: SupabaseMessageRow): Message {
  return {
    id: raw.id,
    senderName: raw.sender_name,
    senderEmail: raw.sender_email,
    subject: (raw.subject || '') as Message['subject'],
    content: raw.content,
    status: raw.status as Message['status'],
    createdAt: raw.created_at,
  };
}

export function toSupabaseMessageInsert(data: SendMessageData) {
  return {
    sender_name: data.name,
    sender_email: data.email,
    subject: data.subject,
    content: data.message,
    status: 'unread',
  };
}
