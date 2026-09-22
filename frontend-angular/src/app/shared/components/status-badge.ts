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
      background: var(--color-neutral-soft);
      color: var(--color-text-secondary);
      /* Borde muy sutil del mismo color semántico (se omite si el navegador no soporta color-mix). */
      box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 22%, transparent);
    }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    :host(.tone-success) { background: var(--color-success-soft); color: var(--color-success-text); }
    :host(.tone-warning) { background: var(--color-warning-soft); color: var(--color-warning); }
    :host(.tone-error) { background: var(--color-error-soft); color: var(--color-error); }
    :host(.tone-info) { background: var(--color-primary-soft); color: var(--color-primary-text); }
  `
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('neutral');
}
