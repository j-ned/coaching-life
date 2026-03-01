import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-stat-card',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-white p-6 rounded-2xl shadow-sm border border-slate-100' },
  template: `
    <div class="flex items-center justify-between">
      <div>
        <p class="text-slate-500 font-medium mb-1">{{ label() }}</p>
        <p class="text-3xl font-bold text-slate-800">{{ value() }}</p>
      </div>
      <div class="w-12 h-12 rounded-full flex items-center justify-center"
           [class]="iconBgClass()">
        <app-icon [name]="icon()" size="lg" />
      </div>
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input.required<string>();
  readonly iconBgClass = input('bg-brand-50 text-brand-500');
}
