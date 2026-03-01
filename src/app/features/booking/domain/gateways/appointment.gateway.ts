import type {
  Appointment,
  AppointmentFormData,
  AppointmentSubmission,
  AppointmentStatus,
  DisabledDate,
} from '../models/appointment.model';

export abstract class AppointmentGateway {
  abstract getBookedSlots(month: string): Promise<readonly Appointment[]>;
  abstract submitAppointment(data: AppointmentFormData): Promise<AppointmentSubmission>;
  abstract getDisabledDates(): Promise<readonly DisabledDate[]>;
  abstract getAllAppointments(): Promise<readonly Appointment[]>;
  abstract updateStatus(id: string, status: AppointmentStatus): Promise<Appointment>;
  abstract deleteAppointment(id: string): Promise<void>;
  abstract addDisabledDate(date: Omit<DisabledDate, 'id'>): Promise<DisabledDate>;
  abstract removeDisabledDate(id: string): Promise<void>;
}
