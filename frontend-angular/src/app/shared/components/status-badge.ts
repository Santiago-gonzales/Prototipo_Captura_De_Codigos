import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Tone } from '../formatting';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"tone-" + tone()' },
  template: `<span class="dot" aria-hidden="true"></span>{{ label() }}`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 9px 3px 8px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 500;
      line-height: 1.4;
      white-space: nowrap;
      background: #FFFFFF0F;
      color: var(--text-secondary);
    }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    :host(.tone-success) { background: #22BB331F; color: #4FD660; }
    :host(.tone-warning) { background: #FFB0201F; color: var(--warning); }
    :host(.tone-error) { background: #FF6B6B1F; color: var(--error); }
    :host(.tone-info) { background: var(--blue-soft); color: #6FA0FF; }
  `
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('neutral');
}
