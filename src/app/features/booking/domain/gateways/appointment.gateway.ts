import type { Observable } from 'rxjs';
import type {
  Appointment,
  AppointmentFormData,
  AppointmentSubmission,
  AppointmentStatus,
  DisabledDate,
} from '../models/appointment.model';

export abstract class AppointmentGateway {
  abstract getBookedSlots(month: string): Observable<readonly Appointment[]>;
  abstract submitAppointment(data: AppointmentFormData): Observable<AppointmentSubmission>;
  abstract getDisabledDates(): Observable<readonly DisabledDate[]>;
  abstract getAllAppointments(): Observable<readonly Appointment[]>;
  abstract updateStatus(id: string, status: AppointmentStatus): Observable<Appointment>;
  abstract deleteAppointment(id: string): Observable<void>;
  abstract addDisabledDate(date: Omit<DisabledDate, 'id'>): Observable<DisabledDate>;
  abstract removeDisabledDate(id: string): Observable<void>;
}
