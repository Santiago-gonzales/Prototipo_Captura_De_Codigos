import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ExportService } from '../../core/export/export.service';
import { InventoryLookupService } from '../../core/lookup/inventory-lookup.service';
import { CaptureSessionService } from '../../core/session/capture-session.service';
import { EmptyState } from '../../shared/components/empty-state';
import { RegistryItem } from './registry-item';

@Component({
  selector: 'app-registry-page',
  imports: [RegistryItem, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="registry">
      <header class="head">
        <div>
          <h1>Registro</h1>
          <p class="summary">
            <span class="mono">{{ session.uniqueCodes() }}</span> código{{ session.uniqueCodes() === 1 ? '' : 's' }} único{{ session.uniqueCodes() === 1 ? '' : 's' }}
            · <span class="mono">{{ session.totalUnits() }}</span> unidades
          </p>
        </div>
      </header>

      <div class="list">
        @for (item of session.items(); track item.barcode) {
          <app-registry-item
            [item]="item"
            [inventoryEntry]="inventory.entry(item.barcode, session.header().warehouseId)"
            [warehouseId]="session.header().warehouseId"
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
          {{ exporting() ? 'Generando…' : 'Exportar a Excel' }}
        </button>
        <button type="button" class="btn btn-secondary" (click)="clear()">Limpiar sesión</button>
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
    .head { padding: 14px var(--gutter) 10px; }
    .head h1 { font-size: 20px; }
    .summary { margin-top: 2px; color: var(--text-secondary); font-size: 13px; }
    .summary .mono { color: var(--text); font-weight: 600; }
    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
      align-content: start;
      gap: 10px;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 4px var(--gutter) 16px;
    }
    .message { padding: 0 var(--gutter) 8px; color: var(--text-secondary); font-size: 12.5px; }
    .actions {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 10px;
      padding: 10px var(--gutter) 12px;
      border-top: 1px solid var(--border);
      background: var(--bg);
    }
    @media (orientation: landscape) and (max-height: 480px) {
      .head { padding-top: 8px; padding-bottom: 6px; }
      .actions { padding-top: 8px; padding-bottom: 8px; }
    }
  `
})
export class RegistryPage {
  protected readonly session = inject(CaptureSessionService);
  protected readonly inventory = inject(InventoryLookupService);
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
