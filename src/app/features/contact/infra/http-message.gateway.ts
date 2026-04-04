import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MessageGateway } from '../domain/gateways/message.gateway';
import type {
  Message,
  MessageStatus,
  MessageSubmission,
  SendMessageData,
} from '../domain/models/message.model';
import { toMessage, toMessageInsert } from './message.adapter';
import type { MessageRow } from './message.adapter';
import { API_URL } from '../../../core/config.js';

const BASE = `${API_URL}/api/messages`;

@Injectable()
export class HttpMessageGateway implements MessageGateway {
  private readonly http = inject(HttpClient);

  async getAll(): Promise<readonly Message[]> {
    try {
      const rows = await firstValueFrom(
        this.http.get<MessageRow[]>(`${BASE}`, { withCredentials: true }),
      );
      return rows.map(toMessage);
    } catch {
      return [];
    }
  }

  async send(data: SendMessageData): Promise<MessageSubmission> {
    try {
      await firstValueFrom(this.http.post(`${BASE}`, toMessageInsert(data)));
      return { success: true, message: 'Votre message a été envoyé avec succès !' };
    } catch {
      return {
        success: false,
        message: "Une erreur est survenue lors de l'envoi. Veuillez réessayer.",
      };
    }
  }

  async updateStatus(id: string, status: MessageStatus): Promise<Message> {
    const row = await firstValueFrom(
      this.http.patch<MessageRow>(`${BASE}/${id}/status`, { status }, { withCredentials: true }),
    );
    return toMessage(row);
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${BASE}/${id}`, { withCredentials: true }));
  }
}
