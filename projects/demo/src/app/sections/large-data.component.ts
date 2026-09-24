import { Component, ChangeDetectionStrategy, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions, type IDatasource } from 'fast-table';

interface Transaction {
  id: number;
  account: string;
  amount: number;
  currency: string;
  timestamp: string;
}

const TOTAL_ROWS = 100000;

function generateRow(i: number): Transaction {
  return {
    id: i + 1,
    account: `ACC-${1000 + (i % 500)}`,
    amount: Math.round((Math.sin(i) * 5000 + 1000) * 100) / 100,
    currency: ['DKK', 'EUR', 'USD'][i % 3],
    timestamp: new Date(2024, 0, 1, 0, 0, i).toISOString(),
  };
}

/** Simulates a backend: resolves after a short delay, like a real HTTP call would. */
class SimulatedDatasource implements IDatasource {
  getRows(params: { startRow: number; endRow: number; successCallback: (rows: any[], lastRow?: number) => void }): void {
    setTimeout(() => {
      const rows: Transaction[] = [];
      const end = Math.min(params.endRow, TOTAL_ROWS);
      for (let i = params.startRow; i < end; i++) rows.push(generateRow(i));
      params.successCallback(rows, end >= TOTAL_ROWS ? TOTAL_ROWS : -1);
    }, 300);
  }
}

@Component({
  selector: 'demo-large-data',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Uendelig datamodel (Infinite Row Model): dette datasæt har {{ totalRows.toLocaleString('da-DK') }} rækker, men
      kun blokke på 100 hentes ad gangen fra en simuleret asynkron datakilde (300 ms "netværksforsinkelse" pr.
      blok), efterhånden som du ruller ned. Prøv at rulle hurtigt til bunden.
    </p>
    <div class="demo-grid-wrap">
      <ft-table [gridOptions]="gridOptions" />
    </div>
  `,
})
export class LargeDataSectionComponent {
  readonly totalRows = TOTAL_ROWS;

  readonly columnDefs: ColDef<Transaction>[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'account', headerName: 'Konto', width: 140 },
    { field: 'amount', headerName: 'Beløb', width: 130, type: 'number' },
    { field: 'currency', headerName: 'Valuta', width: 100 },
    { field: 'timestamp', headerName: 'Tidsstempel', width: 220 },
  ];

  readonly gridOptions: GridOptions<Transaction> = {
    columnDefs: this.columnDefs,
    rowModelType: 'infinite',
    datasource: new SimulatedDatasource(),
    cacheBlockSize: 100,
  };
}
