import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, catchError } from 'rxjs';
import { AppointmentGateway } from '../domain/gateways/appointment.gateway';
import type {
  Appointment,
  AppointmentFormData,
  AppointmentSubmission,
  AppointmentStatus,
  DisabledDate,
} from '../domain/models/appointment.model';
import { Supabase } from '../../../core/services/supabase/supabase';
import { toAppointment, toDisabledDate, toSupabaseInsert } from './appointment.adapter';

@Injectable()
export class SupabaseAppointmentGateway implements AppointmentGateway {
  private readonly supabase = inject(Supabase);

  getBookedSlots(month: string): Observable<readonly Appointment[]> {
    const [year, m] = month.split('-').map(Number);
    const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return from(
      this.supabase.client
        .from('appointments')
        .select('*')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .neq('status', 'cancelled'),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map(toAppointment);
      }),
      catchError(() => of([])),
    );
  }

  submitAppointment(data: AppointmentFormData): Observable<AppointmentSubmission> {
    return from(
      this.supabase.client.from('appointments').insert(toSupabaseInsert(data)).select().single(),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { success: true, message: 'Votre rendez-vous a été réservé avec succès !' };
      }),
      catchError(() =>
        of({
          success: false,
          message: 'Une erreur est survenue lors de la réservation. Veuillez réessayer.',
        }),
      ),
    );
  }

  getDisabledDates(): Observable<readonly DisabledDate[]> {
    return from(this.supabase.client.from('disabled_dates').select('*')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map(toDisabledDate);
      }),
      catchError(() => of([])),
    );
  }

  getAllAppointments(): Observable<readonly Appointment[]> {
    return from(
      this.supabase.client
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map(toAppointment);
      }),
      catchError(() => of([])),
    );
  }

  updateStatus(id: string, status: AppointmentStatus): Observable<Appointment> {
    return from(
      this.supabase.client.from('appointments').update({ status }).eq('id', id).select().single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toAppointment(data!);
      }),
    );
  }

  deleteAppointment(id: string): Observable<void> {
    return from(this.supabase.client.from('appointments').delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  addDisabledDate(date: Omit<DisabledDate, 'id'>): Observable<DisabledDate> {
    return from(
      this.supabase.client
        .from('disabled_dates')
        .insert({ date: date.date, reason: date.reason ?? null })
        .select()
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toDisabledDate(data!);
      }),
    );
  }

  removeDisabledDate(id: string): Observable<void> {
    return from(this.supabase.client.from('disabled_dates').delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }
}
