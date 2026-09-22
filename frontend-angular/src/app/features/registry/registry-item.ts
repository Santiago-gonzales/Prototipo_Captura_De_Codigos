import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { InventoryEntry } from '../../core/lookup/inventory-lookup.service';
import type { ScanItem } from '../../models/scan-item.model';
import type { Warehouse } from '../../models/warehouse.model';
import { QuantityEditor } from '../../shared/components/quantity-editor';
import { StatusBadge } from '../../shared/components/status-badge';
import { formatIsoDate, inventoryBadge, productBadge } from '../../shared/formatting';

@Component({
  selector: 'app-registry-item',
  imports: [QuantityEditor, StatusBadge, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Solo presentación: el color lateral de la tarjeta sigue al estado del producto.
  host: { '[attr.data-state]': "item().product === null ? 'missing' : item().product ? 'found' : 'pending'" },
  template: `
    <div class="main">
      <div class="identity">
        <span class="code">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6v12M7.5 6v12M10 6v12M13.5 6v12M16 6v12M20 6v12" /></svg>
          <strong class="mono">{{ item().barcode }}</strong>
        </span>
        <span class="name" [class.missing]="item().product === null">{{ name() }}</span>
        <div class="badges">
          <app-status-badge [label]="status().label" [tone]="status().tone" />
          @if (inventory(); as badge) { <app-status-badge [label]="badge.label" [tone]="badge.tone" /> }
        </div>
      </div>
      <app-quantity-editor [value]="item().quantity" [label]="item().barcode" (valueChange)="quantityChange.emit($event)" />
    </div>

    <div class="meta">
      @if (warehouse(); as active) {
        <div class="fact" [title]="active.name"><span class="label">Bodega</span><span class="value mono">{{ active.code }}</span></div>
      }
      @if (singleLot(); as lot) {
        <div class="fact"><span class="label">Lote</span><span class="value mono">{{ lot.lot || 'No disponible' }}</span></div>
        <div class="fact"><span class="label">Vence</span><span class="value mono">{{ formatDate(lot.expirationDate) }}</span></div>
      } @else if (lots().length > 1) {
        <div class="fact"><span class="label">Lotes</span><span class="value">{{ lots().length }} lotes con saldo</span></div>
      }
      @if (hasDetails()) {
        <button type="button" class="toggle" [attr.aria-expanded]="expanded()" (click)="expanded.set(!expanded())">
          {{ expanded() ? 'Ocultar' : 'Detalle' }}
        </button>
      }
    </div>

    @if (expanded()) {
      <div class="details">
        @if (item().product?.description; as description) {
          <p class="description">{{ description }}</p>
        }
        @if (inventoryEntry()?.result; as result) {
          <div class="rasi">
            <span class="rasi-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8" /></svg>
            </span>
            <div class="rasi-text">
              <span class="label">Código RASI</span>
              <span class="rasi-value"><span class="mono">{{ result.product.code }}</span> · {{ result.product.name }}</span>
            </div>
          </div>
        }
        @if (lots().length > 0) {
          <table>
            <thead><tr><th>Lote</th><th>Vencimiento</th><th class="num">Saldo</th></tr></thead>
            <tbody>
              @for (lot of lots(); track $index) {
                <tr>
                  <td class="mono">{{ lot.lot || 'No disponible' }}</td>
                  <td class="mono">{{ formatDate(lot.expirationDate) }}</td>
                  <td class="mono num">{{ lot.systemQuantity }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
        <a class="product-link" routerLink="/product" [queryParams]="{ barcode: item().barcode }">
          Ver producto
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>
    }
  `,
  styleUrl: './registry-item.scss'
})
export class RegistryItem {
  readonly item = input.required<ScanItem>();
  readonly inventoryEntry = input<InventoryEntry>();
  /** Bodega activa (se muestra su código; el nombre queda en el título). */
  readonly warehouse = input<Warehouse | null>(null);
  readonly quantityChange = output<number>();

  protected readonly expanded = signal(false);
  protected readonly formatDate = formatIsoDate;

  protected readonly name = computed(() => {
    const product = this.item().product;
    if (product) return product.name;
    return product === null ? 'Producto no encontrado' : 'Consultando producto…';
  });
  protected readonly status = computed(() => productBadge(this.item().product));
  protected readonly inventory = computed(() => inventoryBadge(this.inventoryEntry()));
  protected readonly lots = computed(() => this.inventoryEntry()?.result?.lots ?? []);
  protected readonly singleLot = computed(() => (this.lots().length === 1 ? this.lots()[0] : null));
  protected readonly hasDetails = computed(() =>
    Boolean(this.item().product?.description) || this.lots().length > 0 || Boolean(this.inventoryEntry()?.result)
  );
}
