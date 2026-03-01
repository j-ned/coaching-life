export type MessageStatus = 'unread' | 'read' | 'archived';

export type MessageSubject = 'life_coach' | 'dev_personnel' | 'equine' | 'parents' | 'other' | '';

export const MESSAGE_SUBJECT_LABELS: Record<string, string> = {
  life_coach: 'Coaching de Vie',
  dev_personnel: 'Développement Personnel',
  equine: 'Coaching Équin',
  parents: 'Parents Neuroatypiques',
  other: 'Autre demande',
  '': 'Non spécifié',
};

export type Message = {
  readonly id: string;
  readonly senderName: string;
  readonly senderEmail: string;
  readonly subject: MessageSubject;
  readonly content: string;
  readonly status: MessageStatus;
  readonly createdAt: string;
};

export type SendMessageData = {
  readonly name: string;
  readonly email: string;
  readonly subject: MessageSubject;
  readonly message: string;
};

export type MessageSubmission = {
  readonly success: boolean;
  readonly message: string;
};
