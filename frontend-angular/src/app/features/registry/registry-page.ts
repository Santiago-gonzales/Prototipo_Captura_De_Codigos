import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ExportService } from '../../core/export/export.service';
import { InventoryLookupService } from '../../core/lookup/inventory-lookup.service';
import { CaptureSessionService } from '../../core/session/capture-session.service';
import { WarehouseService } from '../../core/warehouse/warehouse.service';
import { EmptyState } from '../../shared/components/empty-state';
import { RegistryItem } from './registry-item';

@Component({
  selector: 'app-registry-page',
  imports: [RegistryItem, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="registry">
      <header class="head">
        <div class="title">
          <div class="brand">
            <span class="brand-mark">RASI</span>
            <span class="divider" aria-hidden="true"></span>
            <h1>Registro</h1>
          </div>
          <p class="summary">
            <span class="mono">{{ session.uniqueCodes() }}</span> código{{ session.uniqueCodes() === 1 ? '' : 's' }} único{{ session.uniqueCodes() === 1 ? '' : 's' }}
            · <span class="mono">{{ session.totalUnits() }}</span> unidades
          </p>
          @if (warehouse.active(); as active) {
            <p class="warehouse"><span class="label">Bodega</span> {{ active.name }}</p>
          }
        </div>
        <span class="session" [class.live]="session.metrics().isActive" role="status">
          <span class="dot" aria-hidden="true"></span>{{ session.metrics().isActive ? 'En sesión' : 'Sin sesión' }}
        </span>
      </header>

      <div class="list">
        @for (item of session.items(); track item.barcode) {
          <app-registry-item
            [item]="item"
            [inventoryEntry]="inventory.entry(item.barcode)"
            [warehouse]="warehouse.active()"
            (quantityChange)="session.setQuantity(item.barcode, $event)"
          />
        } @empty {
          <app-empty-state title="Sin registros" message="Los códigos capturados con la cámara o el lector Zebra aparecerán aquí." />
        }
      </div>

      @if (message(); as text) {
        <p class="message" role="status">{{ text }}</p>
      }

      <footer class="actions">
        <button type="button" class="btn btn-primary" [disabled]="session.items().length === 0 || exporting()" (click)="export()">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
          {{ exporting() ? 'Generando…' : 'Exportar a Excel' }}
        </button>
        <button type="button" class="btn btn-secondary" (click)="clear()">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
          Limpiar sesión
        </button>
      </footer>
    </section>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .registry {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto auto;
      height: 100%;
      width: min(880px, 100%);
      margin: 0 auto;
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px var(--gutter) 10px;
    }
    .title { min-width: 0; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-mark { color: var(--color-primary); font: 700 15px var(--font-primary); letter-spacing: 0.06em; }
    .divider { width: 1px; height: 16px; background: var(--color-border-strong); }
    .head h1 { font-size: 20px; }
    .summary { margin-top: 2px; color: var(--color-text-secondary); font-size: 13px; }
    .session {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font-size: 11.5px;
      font-weight: 500;
      white-space: nowrap;
    }
    .session .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-text-muted); }
    .session.live { color: var(--color-text); }
    .session.live .dot { background: var(--color-success); box-shadow: 0 0 0 3px var(--color-success-ring); }
    .summary .mono { color: var(--color-text); font-weight: 600; }
    .warehouse { margin-top: 2px; color: var(--color-text-secondary); font-size: 12px; overflow-wrap: anywhere; }
    .warehouse .label { margin-right: 4px; font-size: 10px; }
    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
      align-content: start;
      gap: 10px;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 4px var(--gutter) 16px;
    }
    .message { padding: 0 var(--gutter) 8px; color: var(--color-text-secondary); font-family: var(--font-secondary); font-size: 12.5px; }
    .actions {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 10px;
      padding: 10px var(--gutter) 12px;
      border-top: 1px solid var(--color-border);
      background: var(--color-background);
    }
    .actions .btn { padding: 0 12px; }
    .actions .icon { flex: none; width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    @media (max-width: 359px) { .actions .icon { display: none; } }
    .actions .btn-secondary { background: var(--color-surface); border-color: var(--color-border); color: var(--color-text-secondary); }
    .actions .btn-secondary:hover:not(:disabled) { border-color: var(--color-border-strong); color: var(--color-text); }
    @media (orientation: landscape) and (max-height: 480px) {
      .head { padding-top: 8px; padding-bottom: 6px; }
      .actions { padding-top: 8px; padding-bottom: 8px; }
    }
  `
})
export class RegistryPage {
  protected readonly session = inject(CaptureSessionService);
  protected readonly inventory = inject(InventoryLookupService);
  protected readonly warehouse = inject(WarehouseService);
  private readonly exporter = inject(ExportService);

  protected readonly exporting = signal(false);
  protected readonly message = signal<string | null>(null);

  protected async export() {
    this.exporting.set(true);
    this.message.set(null);
    try {
      const result = await this.exporter.exportCapture();
      this.message.set(result.ok ? `Archivo generado: ${result.fileName}` : result.message);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      this.message.set('No fue posible generar el archivo Excel.');
    } finally {
      this.exporting.set(false);
    }
  }

  protected clear() {
    if (this.session.items().length > 0 && !window.confirm('¿Limpiar la sesión? Se perderán los códigos y cantidades capturados.')) {
      return;
    }
    this.session.clear();
    this.message.set(null);
  }
}
