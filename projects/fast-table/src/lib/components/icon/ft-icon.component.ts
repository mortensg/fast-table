import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

/**
 * A small, self-authored line-icon set (24x24, 2px stroke) so the grid never
 * ships a Unicode glyph as UI chrome. Every icon renders through currentColor
 * so it inherits whatever the surrounding button/state is already doing.
 */
const ICONS: Record<string, string> = {
  'chevron-up': '<path d="M5 15l7-7 7 7"/>',
  'chevron-down': '<path d="M5 9l7 7 7-7"/>',
  'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
  'chevron-right': '<path d="M9 5l7 7-7 7"/>',
  'chevrons-left': '<path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/>',
  'chevrons-right': '<path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/>',
  x: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  undo: '<path d="M4 10h10a5 5 0 0 1 0 10h-2"/><path d="M9 5L4 10l5 5"/>',
  redo: '<path d="M20 10H10a5 5 0 0 0 0 10h2"/><path d="M15 5l5 5-5 5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/>',
  download: '<path d="M12 3v12"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M5 21h14"/>',
  columns:
    '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><path d="M15 4v16"/>',
  filter: '<path d="M4 5h16l-6.2 7.2V19l-3.6 2v-8.8L4 5z"/>',
  zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  'pin-off':
    '<path d="M6 4l14 16"/><path d="M9.2 4.6A7 7 0 0 1 19 10c0 3.2-3.6 8-6.3 10.7"/><path d="M12 10a7 7 0 0 0-7 0c0 3.9 5.1 9.4 6.6 10.9"/>',
  grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  comment:
    '<path d="M21 11.5a8.38 8.38 0 0 1-4.8 7.6 8.5 8.5 0 0 1-8.7-.7L3 20l1.7-4.5a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.4-8.2h.3a8.48 8.48 0 0 1 8.5 8v.5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  clipboard:
    '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 4h6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  'bar-chart': '<path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-6"/>',
  maximize:
    '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
};

@Component({
  selector: 'ft-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      [innerHTML]="markup()"
    ></svg>
  `,
  host: { class: 'ft-icon' },
})
export class FtIconComponent {
  readonly name = input.required<string>();
  private sanitizer = inject(DomSanitizer);

  // The registry above is a fixed, developer-authored set — never fed from
  // user input — so trusting it is the standard, safe pattern for a static
  // inline icon set.
  readonly markup = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()] ?? ''),
  );
}
