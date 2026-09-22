import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { DiagnosticEvent } from '../../core/diagnostics/diagnostic-events';
import { DiagnosticService } from '../../core/diagnostics/diagnostic.service';

function value(details: Record<string, unknown>, key: string) {
  const current = details[key];
  return current === undefined || current === null ? null : String(current);
}

function formatItems(details: Record<string, unknown>) {
  const items = details['items'];
  if (!Array.isArray(items)) return null;
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return String(item);
      const entry = item as { barcode?: unknown; quantity?: unknown };
      return `${String(entry.barcode)} x ${String(entry.quantity)}`;
    })
    .join(', ');
}

/** Mismo formato de detalle que DiagnosticPanel (React). */
function formatEventDetails(event: DiagnosticEvent) {
  const details = event.details;
  const formattedItems = formatItems(details);
  const parts = [
    value(details, 'count') && `count ${value(details, 'count')}`,
    value(details, 'uniqueCodes') && `unique ${value(details, 'uniqueCodes')}`,
    value(details, 'totalUnits') && `total ${value(details, 'totalUnits')}`,
    value(details, 'callbackId') && `callback ${value(details, 'callbackId')}`,
    value(details, 'barcode'),
    value(details, 'barcodes') && `codes ${value(details, 'barcodes')}`,
    formattedItems && `items ${formattedItems}`,
    value(details, 'trackedId') && `id ${value(details, 'trackedId')}`,
    value(details, 'reason'),
    value(details, 'distance') && `dist ${value(details, 'distance')}`,
    value(details, 'maxDistance') && `max ${value(details, 'maxDistance')}`,
    value(details, 'sizeRatio') && `ratio ${value(details, 'sizeRatio')}`,
    value(details, 'elapsed') && `elapsed ${value(details, 'elapsed')} ms`,
    value(details, 'rearmDelayMs') && `rearm ${value(details, 'rearmDelayMs')} ms`,
    value(details, 'previousQuantity') && `prev ${value(details, 'previousQuantity')}`,
    value(details, 'newQuantity') && `new ${value(details, 'newQuantity')}`
  ].filter(Boolean);

  return parts.join(' | ');
}

@Component({
  selector: 'app-diagnostic-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <span class="label">Últimos {{ diagnostics.events().length }} eventos (máx. 30)</span>
      <button type="button" class="btn btn-ghost" (click)="diagnostics.clear()" [disabled]="diagnostics.events().length === 0">Vaciar</button>
    </div>
    @for (event of diagnostics.events(); track event.id) {
      <article [attr.data-type]="event.type">
        <div class="event-head">
          <strong>{{ event.type }}</strong>
          <time class="mono">{{ time(event.timestamp) }}</time>
        </div>
        <div class="event-details mono">{{ format(event) }}</div>
      </article>
    } @empty {
      <p class="empty">Esperando eventos del tracker y captura...</p>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 6px; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; }
    .toolbar .btn { min-height: 36px; padding: 0 10px; font-size: 12.5px; }
    article {
      padding: 8px 10px;
      border-left: 2px solid var(--color-border-strong);
      border-radius: 4px;
      background: var(--color-surface-elevated);
      font-size: 12px;
    }
    article[data-type='TRACKER NEW ENTITY'], article[data-type='APP CAPTURE'] { border-left-color: var(--color-success); }
    article[data-type='TRACKER MATCH REJECT'] { border-left-color: var(--color-warning); }
    article[data-type='TRACKER EXPIRED'] { border-left-color: var(--color-secondary); }
    article[data-type='ZXING DETECTIONS'] { border-left-color: var(--color-primary); }
    .event-head { display: flex; justify-content: space-between; gap: 8px; }
    .event-head strong { font-size: 11px; letter-spacing: 0.04em; }
    time { color: var(--color-text-muted); font-size: 11px; }
    .event-details { margin-top: 2px; color: var(--color-text-secondary); font-size: 11.5px; overflow-wrap: anywhere; }
    .empty { color: var(--color-text-muted); font-size: 13px; }
  `
})
export class DiagnosticPanel {
  protected readonly diagnostics = inject(DiagnosticService);
  protected readonly format = formatEventDetails;
  protected time(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString();
  }
}
