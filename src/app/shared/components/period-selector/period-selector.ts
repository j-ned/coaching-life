import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { Icon } from '../icon/icon';
import type { PeriodFilter } from '../../../features/analytics/domain/models/analytics.model';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

@Component({
  selector: 'app-period-selector',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2' },
  template: `
    <button type="button"
            class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Mois précédent"
            (click)="previousMonth()">
      <app-icon name="chevron-left" size="sm" />
    </button>
    <span class="text-sm font-medium text-slate-700 min-w-[140px] text-center">
      {{ displayLabel() }}
    </span>
    <button type="button"
            class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Mois suivant"
            (click)="nextMonth()">
      <app-icon name="chevron-right" size="sm" />
    </button>
  `,
})
export class PeriodSelector {
  readonly period = model.required<PeriodFilter>();

  protected readonly displayLabel = computed(() => {
    const p = this.period();
    return `${MONTH_NAMES[p.month - 1]} ${p.year}`;
  });

  protected previousMonth(): void {
    const p = this.period();
    if (p.month === 1) {
      this.period.set({ year: p.year - 1, month: 12 });
    } else {
      this.period.set({ year: p.year, month: p.month - 1 });
    }
  }

  protected nextMonth(): void {
    const p = this.period();
    if (p.month === 12) {
      this.period.set({ year: p.year + 1, month: 1 });
    } else {
      this.period.set({ year: p.year, month: p.month + 1 });
    }
  }
}
