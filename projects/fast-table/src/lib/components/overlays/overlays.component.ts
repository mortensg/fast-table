import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'ft-overlay-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-overlay">
      <div class="ft-overlay-spinner"></div>
      <span>Indlæser...</span>
    </div>
  `,
})
export class OverlayLoadingComponent {}

@Component({
  selector: 'ft-overlay-no-rows',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-overlay">
      <span>Ingen rækker at vise</span>
    </div>
  `,
})
export class OverlayNoRowsComponent {}
