import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      [class]="sizeClass()"
      [attr.fill]="filled() ? 'currentColor' : 'none'"
      [attr.stroke]="filled() ? 'none' : 'currentColor'"
      [attr.stroke-width]="filled() ? undefined : 2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <use [attr.href]="iconHref()" />
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input<IconSize>('md');
  readonly filled = input(false);

  protected readonly sizeClass = computed(() => SIZE_CLASSES[this.size()]);
  protected readonly iconHref = computed(() => `/icons/sprite.svg#${this.name()}`);
}
