import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { InventoryLookup } from '../../models/inventory.model';
import type { LookupStatus } from '../../models/lookup-status.model';
import { formatIsoDate } from '../../shared/formatting';

/** Información de inventario RASI tal como la entrega la API; sin datos calculados. */
@Component({
  selector: 'app-inventory-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (status()) {
      @case ('loading') { <p class="muted">Consultando inventario…</p> }
      @case ('error') { <p class="error">No fue posible consultar el inventario.</p> }
      @case ('not-found') { <p class="warning">Código no encontrado en inventario.</p> }
      @case ('idle') { <p class="muted">Sin consulta de inventario.</p> }
      @case ('found') {
        @if (result(); as data) {
          <dl class="facts">
            <div><dt class="label">Código RASI</dt><dd class="mono">{{ data.product.code }}</dd></div>
            <div><dt class="label">Nombre RASI</dt><dd>{{ data.product.name }}</dd></div>
            <div><dt class="label">Bodega</dt><dd class="mono">{{ data.warehouseId ?? 'No indicada' }}</dd></div>
            <div><dt class="label">Estado RASI</dt><dd>{{ data.product.status || 'No disponible' }}</dd></div>
          </dl>

          <h3 class="label lots-title">Lotes con saldo</h3>
          @if (data.lots.length === 0) {
            <p class="muted">No disponible</p>
          } @else {
            <table>
              <thead><tr><th>Lote</th><th>Vencimiento</th><th class="num">Saldo</th></tr></thead>
              <tbody>
                @for (lot of data.lots; track $index) {
                  <tr>
                    <td class="mono">{{ lot.lot || 'No disponible' }}</td>
                    <td class="mono">{{ formatDate(lot.expirationDate) }}</td>
                    <td class="mono num">{{ lot.systemQuantity }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        }
      }
    }
  `,
  styles: `
    :host { display: block; font-size: 13.5px; }
    .muted { color: var(--text-muted); }
    .warning { color: var(--warning); }
    .error { color: var(--error); }
    .facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px 16px;
      margin: 0 0 14px;
    }
    .facts div { min-width: 0; }
    dd { margin: 2px 0 0; overflow-wrap: anywhere; }
    .lots-title { margin-bottom: 4px; font-family: var(--font-body); }
    table { width: 100%; border-collapse: collapse; }
    th {
      padding: 6px 8px;
      color: var(--text-muted);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.06em;
      text-align: left;
      text-transform: uppercase;
    }
    td { padding: 8px; border-top: 1px solid var(--border); }
    .num { text-align: right; }
  `
})
export class InventoryDetails {
  readonly status = input.required<LookupStatus>();
  readonly result = input<InventoryLookup | null>(null);
  protected readonly formatDate = formatIsoDate;
}
