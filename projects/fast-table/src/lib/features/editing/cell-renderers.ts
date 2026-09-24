import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { CellRendererComponent, CellRendererParams } from '../../models/column-def';

@Component({
  selector: 'ft-checkbox-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    class="ft-checkbox-render"
    type="checkbox"
    [checked]="!!params().value"
    disabled
  />`,
})
export class CheckboxCellRendererComponent implements CellRendererComponent {
  readonly params = input.required<CellRendererParams>();
}

@Component({
  selector: 'ft-badge-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="ft-badge" [class]="'ft-badge-' + toneClass()">{{
    params().value
  }}</span>`,
})
export class BadgeCellRendererComponent implements CellRendererComponent {
  readonly params = input.required<CellRendererParams>();

  toneClass(): string {
    const tones =
      (this.params().colDef.cellRendererParams?.['tones'] as Record<string, string>) ?? {};
    return tones[String(this.params().value)] ?? 'default';
  }
}

@Component({
  selector: 'ft-sparkline-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      [attr.width]="width"
      [attr.height]="height"
      class="ft-sparkline"
      preserveAspectRatio="none"
    >
      <polyline [attr.points]="points()" fill="none" stroke="currentColor" stroke-width="1.5" />
    </svg>
  `,
})
export class SparklineCellRendererComponent implements CellRendererComponent {
  readonly params = input.required<CellRendererParams>();
  width = 80;
  height = 24;

  points(): string {
    const values = (this.params().value as number[]) ?? [];
    if (values.length === 0) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = this.width / Math.max(1, values.length - 1);
    return values
      .map((v, i) => `${i * step},${this.height - ((v - min) / range) * this.height}`)
      .join(' ');
  }
}
