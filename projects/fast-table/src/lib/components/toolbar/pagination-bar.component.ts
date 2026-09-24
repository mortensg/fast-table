import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { FtIconComponent } from '../icon/ft-icon.component';

@Component({
  selector: 'ft-pagination-bar',
  standalone: true,
  imports: [FtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-pagination-bar">
      <span class="ft-pagination-info">Side {{ currentPage() + 1 }} af {{ pageCount() }}</span>
      <div class="ft-pagination-controls">
        <button
          class="ft-toolbar-btn ft-icon-btn"
          (click)="pageChange.emit(0)"
          [disabled]="currentPage() === 0"
          title="Første side"
        >
          <ft-icon name="chevrons-left" />
        </button>
        <button
          class="ft-toolbar-btn ft-icon-btn"
          (click)="pageChange.emit(currentPage() - 1)"
          [disabled]="currentPage() === 0"
          title="Forrige side"
        >
          <ft-icon name="chevron-left" />
        </button>
        <button
          class="ft-toolbar-btn ft-icon-btn"
          (click)="pageChange.emit(currentPage() + 1)"
          [disabled]="currentPage() >= pageCount() - 1"
          title="Næste side"
        >
          <ft-icon name="chevron-right" />
        </button>
        <button
          class="ft-toolbar-btn ft-icon-btn"
          (click)="pageChange.emit(pageCount() - 1)"
          [disabled]="currentPage() >= pageCount() - 1"
          title="Sidste side"
        >
          <ft-icon name="chevrons-right" />
        </button>
      </div>
      <select
        class="ft-page-size-select"
        (change)="pageSizeChange.emit(+$any($event.target).value)"
      >
        @for (size of pageSizeOptions(); track size) {
          <option [value]="size" [selected]="size === pageSize()">{{ size }} / side</option>
        }
      </select>
    </div>
  `,
})
export class PaginationBarComponent {
  readonly currentPage = input.required<number>();
  readonly pageCount = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly pageSizeOptions = input<number[]>([25, 50, 100, 200, 500]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
}
