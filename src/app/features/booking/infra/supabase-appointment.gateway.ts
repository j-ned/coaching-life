import { Injectable, inject } from '@angular/core';
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

  async getBookedSlots(month: string): Promise<readonly Appointment[]> {
    const [year, m] = month.split('-').map(Number);
    const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await this.supabase.client
      .from('appointments')
      .select('*')
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .neq('status', 'cancelled');
    if (error) return [];
    return (data ?? []).map(toAppointment);
  }

  async submitAppointment(data: AppointmentFormData): Promise<AppointmentSubmission> {
    const { error } = await this.supabase.client
      .from('appointments')
      .insert(toSupabaseInsert(data))
      .select()
      .single();
    if (error) {
      return {
        success: false,
        message: 'Une erreur est survenue lors de la réservation. Veuillez réessayer.',
      };
    }
    return { success: true, message: 'Votre rendez-vous a été réservé avec succès !' };
  }

  async getDisabledDates(): Promise<readonly DisabledDate[]> {
    const { data, error } = await this.supabase.client.from('disabled_dates').select('*');
    if (error) return [];
    return (data ?? []).map(toDisabledDate);
  }

  async getAllAppointments(): Promise<readonly Appointment[]> {
    const { data, error } = await this.supabase.client
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true });
    if (error) return [];
    return (data ?? []).map(toAppointment);
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const { data, error } = await this.supabase.client
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toAppointment(data!);
  }

  async deleteAppointment(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('appointments').delete().eq('id', id);
    if (error) throw error;
  }

  async addDisabledDate(date: Omit<DisabledDate, 'id'>): Promise<DisabledDate> {
    const { data, error } = await this.supabase.client
      .from('disabled_dates')
      .insert({ date: date.date, reason: date.reason ?? null })
      .select()
      .single();
    if (error) throw error;
    return toDisabledDate(data!);
  }

  async removeDisabledDate(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('disabled_dates').delete().eq('id', id);
    if (error) throw error;
  }
}
