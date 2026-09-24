import { Component, ChangeDetectionStrategy, input, output, HostListener } from '@angular/core';
import type { ContextMenuState } from '../../core/context-menu-service';
import { FtIconComponent } from '../icon/ft-icon.component';

@Component({
  selector: 'ft-context-menu',
  standalone: true,
  imports: [FtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-context-menu" [style.left.px]="state().x" [style.top.px]="state().y">
      <button class="ft-context-menu-item" (click)="action.emit('copy')">
        <ft-icon name="copy" />Kopier
      </button>
      <button class="ft-context-menu-item" (click)="action.emit('paste')">
        <ft-icon name="clipboard" />Indsæt
      </button>
      <button class="ft-context-menu-item" (click)="action.emit('editRow')">
        <ft-icon name="edit" />Rediger hele rækken
      </button>
      <div class="ft-context-menu-sep"></div>
      <button class="ft-context-menu-item" (click)="action.emit('sortAsc')">
        <ft-icon name="chevron-up" />Sorter stigende
      </button>
      <button class="ft-context-menu-item" (click)="action.emit('sortDesc')">
        <ft-icon name="chevron-down" />Sorter faldende
      </button>
      <button class="ft-context-menu-item" (click)="action.emit('clearSort')">
        <ft-icon name="x" />Ryd sortering
      </button>
      <div class="ft-context-menu-sep"></div>
      <button class="ft-context-menu-item" (click)="action.emit('pinLeft')">
        <ft-icon name="chevrons-left" />Fastfrys til venstre
      </button>
      <button class="ft-context-menu-item" (click)="action.emit('pinRight')">
        <ft-icon name="chevrons-right" />Fastfrys til højre
      </button>
      <button class="ft-context-menu-item" (click)="action.emit('unpin')">
        <ft-icon name="pin-off" />Frigør kolonne
      </button>
      <div class="ft-context-menu-sep"></div>
      <button class="ft-context-menu-item" (click)="action.emit('autosize')">
        <ft-icon name="maximize" />Autotilpas bredde
      </button>
      <button class="ft-context-menu-item" (click)="action.emit('exportCsv')">
        <ft-icon name="download" />Eksporter til CSV
      </button>
      <button class="ft-context-menu-item" (click)="action.emit('chart')">
        <ft-icon name="bar-chart" />Opret diagram fra markering
      </button>
    </div>
  `,
})
export class ContextMenuComponent<TData = any> {
  readonly state = input.required<ContextMenuState<TData>>();
  readonly action = output<string>();

  @HostListener('document:click')
  onDocClick(): void {
    this.action.emit('close');
  }
}
