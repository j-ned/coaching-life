import type { Appointment, AppointmentFormData, DisabledDate } from '../domain/models/appointment.model';

export type SupabaseAppointmentRow = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  coaching_type: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  message: string;
  status: string;
  created_at: string;
};

export type SupabaseDisabledDateRow = {
  id: string;
  date: string;
  reason: string | null;
};

export function toAppointment(raw: SupabaseAppointmentRow): Appointment {
  return {
    id: raw.id,
    clientName: raw.client_name,
    clientEmail: raw.client_email,
    clientPhone: raw.client_phone,
    coachingType: raw.coaching_type as Appointment['coachingType'],
    appointmentDate: raw.appointment_date,
    appointmentTime: raw.appointment_time,
    duration: raw.duration,
    message: raw.message ?? '',
    status: raw.status as Appointment['status'],
    createdAt: raw.created_at,
  };
}

export function toDisabledDate(raw: SupabaseDisabledDateRow): DisabledDate {
  return {
    id: raw.id,
    date: raw.date,
    reason: raw.reason ?? undefined,
  };
}

export function toSupabaseInsert(data: AppointmentFormData) {
  return {
    client_name: data.clientName,
    client_email: data.clientEmail,
    client_phone: data.clientPhone,
    coaching_type: data.coachingType,
    appointment_date: data.appointmentDate,
    appointment_time: data.appointmentTime,
    duration: data.duration,
    message: data.message,
  };
}
