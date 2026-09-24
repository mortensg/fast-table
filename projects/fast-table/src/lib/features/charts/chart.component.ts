import { Component, ChangeDetectionStrategy, input, computed, output } from '@angular/core';
import { FtIconComponent } from '../../components/icon/ft-icon.component';

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

export interface ChartSeries {
  name: string;
  values: number[];
}

export interface ChartData {
  categories: string[];
  series: ChartSeries[];
}

const PALETTE = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
];

@Component({
  selector: 'ft-chart',
  standalone: true,
  imports: [FtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-chart-panel">
      <div class="ft-chart-toolbar">
        <select
          class="ft-chart-type-select"
          [value]="type()"
          (change)="typeChange.emit($any($event.target).value)"
        >
          <option value="bar">Søjlediagram</option>
          <option value="line">Liniediagram</option>
          <option value="pie">Cirkeldiagram</option>
          <option value="scatter">Scatterplot</option>
        </select>
        <button class="ft-chart-close" (click)="closed.emit()" title="Luk">
          <ft-icon name="x" />
        </button>
      </div>
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="ft-chart-svg">
        @switch (type()) {
          @case ('bar') {
            @for (bar of barLayout(); track $index) {
              <rect
                [attr.x]="bar.x"
                [attr.y]="bar.y"
                [attr.width]="bar.width"
                [attr.height]="bar.height"
                [attr.fill]="bar.color"
              />
            }
          }
          @case ('line') {
            @for (line of lineLayout(); track $index) {
              <polyline
                [attr.points]="line.points"
                fill="none"
                [attr.stroke]="line.color"
                stroke-width="2"
              />
            }
          }
          @case ('pie') {
            @for (slice of pieLayout(); track $index) {
              <path [attr.d]="slice.path" [attr.fill]="slice.color" />
            }
          }
          @case ('scatter') {
            @for (point of scatterLayout(); track $index) {
              <circle [attr.cx]="point.x" [attr.cy]="point.y" r="3" [attr.fill]="point.color" />
            }
          }
        }
      </svg>
      <div class="ft-chart-legend">
        @for (s of data().series; track s.name; let i = $index) {
          <span class="ft-chart-legend-item"
            ><span class="ft-chart-swatch" [style.background]="color(i)"></span>{{ s.name }}</span
          >
        }
      </div>
    </div>
  `,
})
export class ChartComponent {
  readonly data = input.required<ChartData>();
  readonly type = input<ChartType>('bar');
  readonly typeChange = output<ChartType>();
  readonly closed = output<void>();

  width = 480;
  height = 260;
  private margin = 30;

  color(i: number): string {
    return PALETTE[i % PALETTE.length];
  }

  private maxValue(): number {
    const all = this.data().series.flatMap((s) => s.values);
    return Math.max(1, ...all);
  }

  readonly barLayout = computed(() => {
    const d = this.data();
    const max = this.maxValue();
    const groupWidth = (this.width - this.margin * 2) / Math.max(1, d.categories.length);
    const barWidth = groupWidth / Math.max(1, d.series.length) - 4;
    const bars: { x: number; y: number; width: number; height: number; color: string }[] = [];
    d.categories.forEach((_, catIndex) => {
      d.series.forEach((s, seriesIndex) => {
        const value = s.values[catIndex] ?? 0;
        const barHeight = (value / max) * (this.height - this.margin * 2);
        bars.push({
          x: this.margin + catIndex * groupWidth + seriesIndex * (barWidth + 4),
          y: this.height - this.margin - barHeight,
          width: Math.max(1, barWidth),
          height: barHeight,
          color: this.color(seriesIndex),
        });
      });
    });
    return bars;
  });

  readonly lineLayout = computed(() => {
    const d = this.data();
    const max = this.maxValue();
    const stepX = (this.width - this.margin * 2) / Math.max(1, d.categories.length - 1);
    return d.series.map((s, seriesIndex) => ({
      color: this.color(seriesIndex),
      points: s.values
        .map(
          (v, i) =>
            `${this.margin + i * stepX},${this.height - this.margin - (v / max) * (this.height - this.margin * 2)}`,
        )
        .join(' '),
    }));
  });

  readonly scatterLayout = computed(() => {
    const d = this.data();
    const max = this.maxValue();
    const stepX = (this.width - this.margin * 2) / Math.max(1, d.categories.length - 1);
    const points: { x: number; y: number; color: string }[] = [];
    d.series.forEach((s, seriesIndex) => {
      s.values.forEach((v, i) => {
        points.push({
          x: this.margin + i * stepX,
          y: this.height - this.margin - (v / max) * (this.height - this.margin * 2),
          color: this.color(seriesIndex),
        });
      });
    });
    return points;
  });

  readonly pieLayout = computed(() => {
    const d = this.data();
    const values = d.series[0]?.values ?? [];
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = Math.min(this.width, this.height) / 2 - this.margin;
    let angle = -Math.PI / 2;
    return values.map((v, i) => {
      const slice = (v / total) * Math.PI * 2;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      angle += slice;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      const largeArc = slice > Math.PI ? 1 : 0;
      return {
        color: this.color(i),
        path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      };
    });
  });
}
