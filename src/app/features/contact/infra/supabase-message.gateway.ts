import { Injectable, inject } from '@angular/core';
import { MessageGateway } from '../domain/gateways/message.gateway';
import type {
  Message,
  MessageStatus,
  MessageSubmission,
  SendMessageData,
} from '../domain/models/message.model';
import { Supabase } from '../../../core/services/supabase/supabase';
import { toMessage, toSupabaseMessageInsert } from './message.adapter';

@Injectable()
export class SupabaseMessageGateway implements MessageGateway {
  private readonly supabase = inject(Supabase);

  async getAll(): Promise<readonly Message[]> {
    const { data, error } = await this.supabase.client
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []).map(toMessage);
  }

  async send(data: SendMessageData): Promise<MessageSubmission> {
    const { error } = await this.supabase.client
      .from('messages')
      .insert(toSupabaseMessageInsert(data))
      .select()
      .single();
    if (error) {
      return {
        success: false,
        message: "Une erreur est survenue lors de l'envoi. Veuillez réessayer.",
      };
    }
    return { success: true, message: 'Votre message a été envoyé avec succès !' };
  }

  async updateStatus(id: string, status: MessageStatus): Promise<Message> {
    const { data, error } = await this.supabase.client
      .from('messages')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toMessage(data!);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('messages').delete().eq('id', id);
    if (error) throw error;
  }
}
