import type {
  Message,
  MessageStatus,
  MessageSubmission,
  SendMessageData,
} from '../models/message.model';

export abstract class MessageGateway {
  abstract getAll(): Promise<readonly Message[]>;
  abstract send(data: SendMessageData): Promise<MessageSubmission>;
  abstract updateStatus(id: string, status: MessageStatus): Promise<Message>;
  abstract delete(id: string): Promise<void>;
}
