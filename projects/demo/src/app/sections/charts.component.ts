import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions } from 'fast-table';

interface SalesRow {
  month: string;
  productA: number;
  productB: number;
  productC: number;
  trend: number[];
}

function makeSales(): SalesRow[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  return months.map((month, i) => ({
    month,
    productA: 100 + Math.round(Math.sin(i / 2) * 40 + i * 5),
    productB: 80 + Math.round(Math.cos(i / 3) * 30 + i * 3),
    productC: 60 + Math.round(Math.sin(i / 4 + 1) * 20 + i * 4),
    trend: Array.from({ length: 10 }, (_, k) => 20 + ((i * 17 + k * 31) % 60)),
  }));
}

@Component({
  selector: 'demo-charts',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Markér et celleområde (fx månedskolonnen + en eller flere produktkolonner) og højreklik → "Opret diagram fra
      markering" for at åbne et interaktivt søjle-/linje-/cirkel-/scatterdiagram. Kolonnen "Trend" bruger
      cellerenderer "sparkline" til at vise inline mini-graf uden at åbne et separat diagram.
    </p>
    <div class="demo-grid-wrap">
      <ft-table [gridOptions]="gridOptions()" />
    </div>
  `,
})
export class ChartsSectionComponent {
  readonly rowData = signal<SalesRow[]>(makeSales());

  readonly columnDefs: ColDef<SalesRow>[] = [
    { field: 'month', headerName: 'Måned', width: 100 },
    { field: 'productA', headerName: 'Produkt A', width: 120, type: 'number' },
    { field: 'productB', headerName: 'Produkt B', width: 120, type: 'number' },
    { field: 'productC', headerName: 'Produkt C', width: 120, type: 'number' },
    { field: 'trend', headerName: 'Trend', width: 140, cellRenderer: 'sparkline', sortable: false, filter: false },
  ];

  readonly gridOptions = computed<GridOptions<SalesRow>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData(),
    cellSelection: true,
  }));
}
