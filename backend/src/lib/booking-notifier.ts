import { notifyAdminNewAppointment, sendAppointmentConfirmation } from './mailer.js';
import type { CreateAppointmentInput } from './appointment-schema.js';

export type BookingNotifier = {
  readonly appointmentBooked: (data: CreateAppointmentInput) => Promise<void>;
};

export const mailBookingNotifier: BookingNotifier = {
  appointmentBooked: async (data) => {
    const summary = {
      clientName: data.client_name,
      clientEmail: data.client_email,
      coachingType: data.coaching_type,
      date: data.appointment_date,
      time: data.appointment_time,
    };
    await Promise.all([
      sendAppointmentConfirmation({ ...summary, duration: data.duration }),
      notifyAdminNewAppointment(summary),
    ]);
  },
};
