import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppointmentGateway } from '../domain/gateways/appointment.gateway';
import type {
  Appointment,
  AppointmentFormData,
  AppointmentSubmission,
  AppointmentStatus,
  DisabledDate,
} from '../domain/models/appointment.model';
import { toAppointment, toDisabledDate, toInsert } from './appointment.adapter';
import type { AppointmentRow, DisabledDateRow } from './appointment.adapter';
import { API_URL } from '@core/config';

const BASE = `${API_URL}/api/appointments`;
const GENERIC_SUBMISSION_ERROR =
  'Une erreur est survenue lors de la réservation. Veuillez réessayer.';
const SLOT_TAKEN_MESSAGE = "Ce créneau vient d'être réservé, choisissez-en un autre.";

function toSubmissionFailure(error: unknown): AppointmentSubmission {
  if (error instanceof HttpErrorResponse && error.status === 409) {
    return { success: false, reason: 'slot-taken', message: SLOT_TAKEN_MESSAGE };
  }
  if (error instanceof HttpErrorResponse && error.status === 422) {
    const serverMessage: unknown = error.error?.error;
    return {
      success: false,
      reason: 'rejected',
      message: typeof serverMessage === 'string' ? serverMessage : GENERIC_SUBMISSION_ERROR,
    };
  }
  return { success: false, reason: 'error', message: GENERIC_SUBMISSION_ERROR };
}

@Injectable()
export class HttpAppointmentGateway implements AppointmentGateway {
  private readonly http = inject(HttpClient);

  async getBookedSlots(month: string): Promise<readonly Appointment[]> {
    try {
      const rows = await firstValueFrom(
        this.http.get<AppointmentRow[]>(`${BASE}/booked?month=${month}`),
      );
      return rows.map(toAppointment);
    } catch {
      return [];
    }
  }

  async submitAppointment(data: AppointmentFormData): Promise<AppointmentSubmission> {
    try {
      await firstValueFrom(this.http.post(`${BASE}`, toInsert(data)));
      return { success: true, message: 'Votre rendez-vous a été réservé avec succès !' };
    } catch (error) {
      return toSubmissionFailure(error);
    }
  }

  async getDisabledDates(): Promise<readonly DisabledDate[]> {
    try {
      const rows = await firstValueFrom(this.http.get<DisabledDateRow[]>(`${BASE}/disabled-dates`));
      return rows.map(toDisabledDate);
    } catch {
      return [];
    }
  }

  async getAllAppointments(): Promise<readonly Appointment[]> {
    try {
      const rows = await firstValueFrom(
        this.http.get<AppointmentRow[]>(`${BASE}`, { withCredentials: true }),
      );
      return rows.map(toAppointment);
    } catch {
      return [];
    }
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const row = await firstValueFrom(
      this.http.patch<AppointmentRow>(
        `${BASE}/${id}/status`,
        { status },
        { withCredentials: true },
      ),
    );
    return toAppointment(row);
  }

  async deleteAppointment(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${BASE}/${id}`, { withCredentials: true }));
  }

  async addDisabledDate(date: Omit<DisabledDate, 'id'>): Promise<DisabledDate> {
    const row = await firstValueFrom(
      this.http.post<DisabledDateRow>(`${BASE}/disabled-dates`, date, { withCredentials: true }),
    );
    return toDisabledDate(row);
  }

  async removeDisabledDate(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${BASE}/disabled-dates/${id}`, { withCredentials: true }),
    );
  }
}
