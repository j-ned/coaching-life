import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration } from 'chart.js';
import type { WeeklyDataPoint } from '../../../features/analytics/domain/models/analytics.model';

@Component({
  selector: 'app-activity-chart',
  imports: [BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="h-64">
      <canvas baseChart
              [data]="chartData()"
              [options]="chartOptions"
              type="bar">
      </canvas>
    </div>
  `,
})
export class ActivityChart {
  readonly data = input.required<WeeklyDataPoint[]>();

  protected readonly chartData = computed((): ChartConfiguration<'bar'>['data'] => {
    const points = this.data();
    return {
      labels: points.map(p => p.weekLabel),
      datasets: [
        {
          label: 'Visites',
          data: points.map(p => p.visits),
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
          borderRadius: 4,
        },
        {
          label: 'RDV',
          data: points.map(p => p.appointments),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderRadius: 4,
        },
        {
          label: 'Messages',
          data: points.map(p => p.messages),
          backgroundColor: 'rgba(20, 184, 166, 0.8)',
          borderRadius: 4,
        },
      ],
    };
  });

  protected readonly chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      x: {
        grid: { display: false },
      },
    },
  };
}
