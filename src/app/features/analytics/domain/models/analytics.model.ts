import type { AppointmentStatus, CoachingType } from '../../../booking/domain/models/appointment.model';
import type { MessageSubject } from '../../../contact/domain/models/message.model';

export type PageVisit = {
  readonly id: string;
  readonly pagePath: string;
  readonly visitedAt: string;
  readonly referrer: string;
  readonly userAgent: string;
};

export type DashboardStats = {
  readonly visitsLast30Days: number;
  readonly upcomingAppointments: number;
  readonly unreadMessages: number;
  readonly appointmentStatusBreakdown: AppointmentStatusBreakdown;
  readonly appointmentServiceBreakdown: Partial<Record<CoachingType, number>>;
  readonly messageServiceBreakdown: Partial<Record<MessageSubject, number>>;
};

export type AppointmentStatusBreakdown = Record<AppointmentStatus, number>;

export type WeeklyDataPoint = {
  readonly weekLabel: string;
  readonly visits: number;
  readonly appointments: number;
  readonly messages: number;
};

export type PeriodFilter = {
  readonly year: number;
  readonly month: number;
};
