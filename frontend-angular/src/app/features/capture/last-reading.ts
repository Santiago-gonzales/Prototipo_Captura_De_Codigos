import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { InventoryLookupService } from '../../core/lookup/inventory-lookup.service';
import { ProductLookupService } from '../../core/lookup/product-lookup.service';
import { CaptureSessionService } from '../../core/session/capture-session.service';
import { StatusBadge } from '../../shared/components/status-badge';
import { inventoryBadge } from '../../shared/formatting';

/** Última lectura: mismo texto de producto que React y estado de validación en inventario. */
@Component({
  selector: 'app-last-reading',
  imports: [StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="label">Última lectura</span>
    <strong class="code mono">{{ barcode() ?? '—' }}</strong>
    <span class="name" [title]="productText()">{{ productText() }}</span>
    @if (productBadge() || inventory()) {
      <div class="badges">
        @if (productBadge(); as badge) { <app-status-badge [label]="badge.label" [tone]="badge.tone" /> }
        @if (inventory(); as badge) { <app-status-badge [label]="badge.label" [tone]="badge.tone" /> }
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .code { font-size: 19px; font-weight: 600; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .name { min-width: 0; color: var(--color-text-secondary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .badges { display: flex; flex-wrap: wrap; gap: 4px 6px; margin-top: 3px; }
  `
})
export class LastReading {
  private readonly session = inject(CaptureSessionService);
  private readonly products = inject(ProductLookupService);
  private readonly inventoryLookup = inject(InventoryLookupService);

  protected readonly barcode = this.session.lastDetectedBarcode;

  protected readonly productText = computed(() => {
    const product = this.products.activeProduct();
    const barcode = this.barcode();
    const status = this.products.status();
    if (product) return product.name;
    if (!barcode) return 'Sin lecturas';
    if (status === 'not-found') return 'Producto no encontrado';
    if (status === 'loading') return 'Consultando producto...';
    return 'Producto no consultado';
  });

  protected readonly productBadge = computed(() => {
    const product = this.products.activeProduct();
    if (!this.barcode()) return null;
    if (product) return product.status ? { label: 'Activo', tone: 'success' as const } : { label: 'Inactivo', tone: 'warning' as const };
    if (this.products.status() === 'not-found') return { label: 'No encontrado', tone: 'error' as const };
    if (this.products.status() === 'error') return { label: 'Error de consulta', tone: 'error' as const };
    return null;
  });

  protected readonly inventory = computed(() => {
    const barcode = this.barcode();
    return barcode ? inventoryBadge(this.inventoryLookup.entry(barcode)) : null;
  });
}
