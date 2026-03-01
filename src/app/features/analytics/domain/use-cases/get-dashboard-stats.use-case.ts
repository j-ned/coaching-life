import { inject, Injectable } from '@angular/core';
import { forkJoin, map, type Observable } from 'rxjs';
import { PageVisitGateway } from '../gateways/page-visit.gateway';
import { AppointmentGateway } from '../../../booking/domain/gateways/appointment.gateway';
import { MessageGateway } from '../../../contact/domain/gateways/message.gateway';
import type { DashboardStats, AppointmentStatusBreakdown } from '../models/analytics.model';
import type {
  AppointmentStatus,
  CoachingType,
} from '../../../booking/domain/models/appointment.model';
import type { MessageSubject } from '../../../contact/domain/models/message.model';

@Injectable({ providedIn: 'root' })
export class GetDashboardStatsUseCase {
  private readonly pageVisitGateway = inject(PageVisitGateway);
  private readonly appointmentGateway = inject(AppointmentGateway);
  private readonly messageGateway = inject(MessageGateway);

  execute(): Observable<DashboardStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sinceDate = thirtyDaysAgo.toISOString();

    const today = new Date().toISOString().split('T')[0];

    return forkJoin({
      visitCount: this.pageVisitGateway.countVisitsSince(sinceDate),
      appointments: this.appointmentGateway.getAllAppointments(),
      messages: this.messageGateway.getAll(),
    }).pipe(
      map(({ visitCount, appointments, messages }) => {
        const upcoming = appointments.filter(
          (a) => a.appointmentDate >= today && (a.status === 'pending' || a.status === 'confirmed'),
        );

        const unread = messages.filter((m) => m.status === 'unread');

        const statusBreakdown: AppointmentStatusBreakdown = {
          pending: 0,
          confirmed: 0,
          cancelled: 0,
          completed: 0,
        };
        const serviceBreakdown: Partial<Record<CoachingType, number>> = {};
        for (const a of appointments) {
          statusBreakdown[a.status as AppointmentStatus]++;
          const ct = a.coachingType as CoachingType;
          serviceBreakdown[ct] = (serviceBreakdown[ct] ?? 0) + 1;
        }

        const messageServiceBreakdown: Partial<Record<MessageSubject, number>> = {};
        for (const m of messages) {
          const subj = m.subject as MessageSubject;
          messageServiceBreakdown[subj] = (messageServiceBreakdown[subj] ?? 0) + 1;
        }

        return {
          visitsLast30Days: visitCount,
          upcomingAppointments: upcoming.length,
          unreadMessages: unread.length,
          appointmentStatusBreakdown: statusBreakdown,
          appointmentServiceBreakdown: serviceBreakdown,
          messageServiceBreakdown: messageServiceBreakdown,
        };
      }),
    );
  }
}
