import type { Message, SendMessageData } from '../domain/models/message.model';

export class MessageBuilder {
  private entity: Message = {
    id: 'msg-001',
    senderName: 'Jean Martin',
    senderEmail: 'jean.martin@email.fr',
    subject: 'life_coach',
    content: 'Bonjour, je souhaite prendre rendez-vous pour un coaching de vie.',
    status: 'unread',
    createdAt: '2026-03-01T14:30:00.000Z',
  };

  private constructor() {}

  static default(): MessageBuilder {
    return new MessageBuilder();
  }

  with<K extends keyof Message>(key: K, value: Message[K]): MessageBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): Message {
    return { ...this.entity };
  }
}

export class SendMessageDataBuilder {
  private entity: SendMessageData = {
    name: 'Jean Martin',
    email: 'jean.martin@email.fr',
    subject: 'life_coach',
    message: 'Bonjour, je souhaite prendre rendez-vous pour un coaching de vie.',
  };

  private constructor() {}

  static default(): SendMessageDataBuilder {
    return new SendMessageDataBuilder();
  }

  with<K extends keyof SendMessageData>(key: K, value: SendMessageData[K]): SendMessageDataBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): SendMessageData {
    return { ...this.entity };
  }
}
