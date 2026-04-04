import type {
  Appointment,
  AppointmentFormData,
  DisabledDate,
} from '../domain/models/appointment.model';

export type AppointmentRow = {
  id: string;
  created_at: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  coaching_type: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  message: string;
  status: string;
};

export type DisabledDateRow = {
  id: string;
  date: string;
  reason: string | null;
};

export function toAppointment(raw: AppointmentRow): Appointment {
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

export function toDisabledDate(raw: DisabledDateRow): DisabledDate {
  return {
    id: raw.id,
    date: raw.date,
    reason: raw.reason ?? undefined,
  };
}

export function toInsert(data: AppointmentFormData) {
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
