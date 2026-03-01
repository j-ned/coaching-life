import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, catchError } from 'rxjs';
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
export class SupabaseMessageGateway extends MessageGateway {
  private readonly supabase = inject(Supabase);

  getAll(): Observable<readonly Message[]> {
    return from(
      this.supabase.client.from('messages').select('*').order('created_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map(toMessage);
      }),
      catchError(() => of([])),
    );
  }

  send(data: SendMessageData): Observable<MessageSubmission> {
    return from(
      this.supabase.client.from('messages').insert(toSupabaseMessageInsert(data)).select().single(),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { success: true, message: 'Votre message a été envoyé avec succès !' };
      }),
      catchError(() =>
        of({
          success: false,
          message: "Une erreur est survenue lors de l'envoi. Veuillez réessayer.",
        }),
      ),
    );
  }

  updateStatus(id: string, status: MessageStatus): Observable<Message> {
    return from(
      this.supabase.client.from('messages').update({ status }).eq('id', id).select().single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toMessage(data!);
      }),
    );
  }

  delete(id: string): Observable<void> {
    return from(this.supabase.client.from('messages').delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }
}
