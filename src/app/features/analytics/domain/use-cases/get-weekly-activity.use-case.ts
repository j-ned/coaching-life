import { inject, Injectable } from '@angular/core';
import { PageVisitGateway } from '../gateways/page-visit.gateway';
import { AppointmentGateway } from '../../../booking/domain/gateways/appointment.gateway';
import { MessageGateway } from '../../../contact/domain/gateways/message.gateway';
import type { PeriodFilter, WeeklyDataPoint } from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class GetWeeklyActivityUseCase {
  private readonly pageVisitGateway = inject(PageVisitGateway);
  private readonly appointmentGateway = inject(AppointmentGateway);
  private readonly messageGateway = inject(MessageGateway);

  async execute(period: PeriodFilter): Promise<WeeklyDataPoint[]> {
    const { year, month } = period;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [visits, appointments, messages] = await Promise.all([
      this.pageVisitGateway.getVisitsBetween(
        `${startDate}T00:00:00.000Z`,
        `${endDate}T23:59:59.999Z`,
      ),
      this.appointmentGateway.getAllAppointments(),
      this.messageGateway.getAll(),
    ]);

    const weeks = this.getWeekRanges(year, month, lastDay);

    return weeks.map((week) => {
      const visitCount = visits.filter((v) => {
        const d = v.visitedAt.split('T')[0];
        return d >= week.start && d <= week.end;
      }).length;

      const appointmentCount = [...appointments].filter(
        (a) => a.appointmentDate >= week.start && a.appointmentDate <= week.end,
      ).length;

      const messageCount = [...messages].filter((m) => {
        const d = m.createdAt.split('T')[0];
        return d >= week.start && d <= week.end;
      }).length;

      return {
        weekLabel: week.label,
        visits: visitCount,
        appointments: appointmentCount,
        messages: messageCount,
      };
    });
  }

  private getWeekRanges(
    year: number,
    month: number,
    lastDay: number,
  ): { start: string; end: string; label: string }[] {
    const weeks: { start: string; end: string; label: string }[] = [];
    let weekStart = 1;
    let weekIndex = 1;

    while (weekStart <= lastDay) {
      const weekEnd = Math.min(weekStart + 6, lastDay);
      const pad = (n: number) => String(n).padStart(2, '0');
      const m = String(month).padStart(2, '0');

      weeks.push({
        start: `${year}-${m}-${pad(weekStart)}`,
        end: `${year}-${m}-${pad(weekEnd)}`,
        label: `S${weekIndex}`,
      });

      weekStart = weekEnd + 1;
      weekIndex++;
    }

    return weeks;
  }
}
