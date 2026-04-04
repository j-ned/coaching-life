import type { Message, SendMessageData } from '../domain/models/message.model';

export type MessageRow = {
  id: string;
  created_at: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  content: string;
  status: string;
};

export function toMessage(raw: MessageRow): Message {
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

export function toMessageInsert(data: SendMessageData) {
  return {
    sender_name: data.name,
    sender_email: data.email,
    subject: data.subject,
    content: data.message,
    status: 'unread',
  };
}
