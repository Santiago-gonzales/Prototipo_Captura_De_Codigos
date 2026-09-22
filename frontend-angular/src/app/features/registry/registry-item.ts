import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { InventoryEntry } from '../../core/lookup/inventory-lookup.service';
import type { ScanItem } from '../../models/scan-item.model';
import { QuantityEditor } from '../../shared/components/quantity-editor';
import { StatusBadge } from '../../shared/components/status-badge';
import { formatIsoDate, inventoryBadge, productBadge } from '../../shared/formatting';

@Component({
  selector: 'app-registry-item',
  imports: [QuantityEditor, StatusBadge, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="main">
      <div class="identity">
        <strong class="code mono">{{ item().barcode }}</strong>
        <span class="name" [class.missing]="item().product === null">{{ name() }}</span>
        <div class="badges">
          <app-status-badge [label]="status().label" [tone]="status().tone" />
          @if (inventory(); as badge) { <app-status-badge [label]="badge.label" [tone]="badge.tone" /> }
        </div>
      </div>
      <app-quantity-editor [value]="item().quantity" [label]="item().barcode" (valueChange)="quantityChange.emit($event)" />
    </div>

    <div class="meta">
      <span><span class="label">Bodega</span> {{ warehouseId() }}</span>
      @if (singleLot(); as lot) {
        <span><span class="label">Lote</span> {{ lot.lot || 'No disponible' }}</span>
        <span><span class="label">Vence</span> {{ formatDate(lot.expirationDate) }}</span>
      } @else if (lots().length > 1) {
        <span>{{ lots().length }} lotes con saldo</span>
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
          <p class="rasi"><span class="label">Código RASI</span> <span class="mono">{{ result.product.code }}</span> · {{ result.product.name }}</p>
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
        <a class="product-link" routerLink="/product" [queryParams]="{ barcode: item().barcode }">Ver producto</a>
      </div>
    }
  `,
  styleUrl: './registry-item.scss'
})
export class RegistryItem {
  readonly item = input.required<ScanItem>();
  readonly inventoryEntry = input<InventoryEntry>();
  readonly warehouseId = input.required<number>();
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
