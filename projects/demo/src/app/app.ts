import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { BasicsSectionComponent } from './sections/basics.component';
import { EditingSectionComponent } from './sections/editing.component';
import { GroupingSectionComponent } from './sections/grouping.component';
import { MasterDetailSectionComponent } from './sections/master-detail.component';
import { PivotSectionComponent } from './sections/pivot.component';
import { FormulasSectionComponent } from './sections/formulas.component';
import { SelectionSectionComponent } from './sections/selection.component';
import { ChartsSectionComponent } from './sections/charts.component';
import { ExportSectionComponent } from './sections/export.component';
import { LargeDataSectionComponent } from './sections/large-data.component';
import { AlignedGridsSectionComponent } from './sections/aligned-grids.component';
import { MiscSectionComponent } from './sections/misc.component';

type SectionId =
  | 'basics'
  | 'editing'
  | 'grouping'
  | 'masterDetail'
  | 'pivot'
  | 'formulas'
  | 'selection'
  | 'charts'
  | 'export'
  | 'largeData'
  | 'alignedGrids'
  | 'misc';

interface Section {
  id: SectionId;
  label: string;
}

const SECTIONS: Section[] = [
  { id: 'basics', label: 'Grundlæggende' },
  { id: 'editing', label: 'Redigering' },
  { id: 'grouping', label: 'Gruppering & Træ' },
  { id: 'masterDetail', label: 'Master-Detail' },
  { id: 'pivot', label: 'Pivot' },
  { id: 'formulas', label: 'Formler' },
  { id: 'selection', label: 'Markering & Udfyldning' },
  { id: 'charts', label: 'Diagrammer & Sparklines' },
  { id: 'export', label: 'Eksport & Udklipsholder' },
  { id: 'largeData', label: 'Store datasæt (Infinite)' },
  { id: 'alignedGrids', label: 'Justerede tabeller' },
  { id: 'misc', label: 'Kommentarer, DnD, RTL, A11y' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    BasicsSectionComponent,
    EditingSectionComponent,
    GroupingSectionComponent,
    MasterDetailSectionComponent,
    PivotSectionComponent,
    FormulasSectionComponent,
    SelectionSectionComponent,
    ChartsSectionComponent,
    ExportSectionComponent,
    LargeDataSectionComponent,
    AlignedGridsSectionComponent,
    MiscSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly sections = SECTIONS;
  readonly active = signal<SectionId>('basics');

  select(id: SectionId): void {
    this.active.set(id);
  }
}
