import type { Observable } from 'rxjs';
import type { Message, MessageStatus, MessageSubmission, SendMessageData } from '../models/message.model';

export abstract class MessageGateway {
  abstract getAll(): Observable<readonly Message[]>;
  abstract send(data: SendMessageData): Observable<MessageSubmission>;
  abstract updateStatus(id: string, status: MessageStatus): Observable<Message>;
  abstract delete(id: string): Observable<void>;
}
