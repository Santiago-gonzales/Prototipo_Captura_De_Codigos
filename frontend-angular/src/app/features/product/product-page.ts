import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { InventoryLookupService } from '../../core/lookup/inventory-lookup.service';
import { ProductLookupService } from '../../core/lookup/product-lookup.service';
import { CaptureSessionService } from '../../core/session/capture-session.service';
import type { LookupStatus } from '../../models/lookup-status.model';
import { EmptyState } from '../../shared/components/empty-state';
import { StatusBadge } from '../../shared/components/status-badge';
import { productBadge } from '../../shared/formatting';
import { InventoryDetails } from './inventory-details';

const swipeThreshold = 45;

@Component({
  selector: 'app-product-page',
  imports: [InventoryDetails, StatusBadge, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-page.html',
  styleUrl: './product-page.scss'
})
export class ProductPage {
  private readonly session = inject(CaptureSessionService);
  private readonly products = inject(ProductLookupService);
  protected readonly inventory = inject(InventoryLookupService);

  /** Query param opcional (?barcode=) para abrir un elemento desde Registro. */
  readonly barcode = input<string>();

  protected readonly items = this.session.items;
  protected readonly index = signal(0);
  private pointerStartX: number | null = null;

  protected readonly current = computed(() => this.items()[this.index()]);

  /** Misma regla que ProductLookup (React). */
  protected readonly currentStatus = computed<LookupStatus>(() => {
    const item = this.current();
    if (!item) return 'idle';
    if (item.product) return 'found';
    if (item.barcode === this.products.activeBarcode()) return this.products.status();
    return item.product === null ? 'not-found' : 'loading';
  });

  protected readonly status = computed(() => productBadge(this.current()?.product));

  protected readonly inventoryEntry = computed(() => {
    const item = this.current();
    return item ? this.inventory.entry(item.barcode, this.session.header().warehouseId) : undefined;
  });

  constructor() {
    // Mantener el índice dentro del rango cuando cambia el número de ítems.
    effect(() => {
      const length = this.items().length;
      untracked(() => this.index.update((index) => (length === 0 ? 0 : Math.min(index, length - 1))));
    });

    effect(() => {
      const barcode = this.barcode();
      if (!barcode) return;
      const position = untracked(this.items).findIndex((item) => item.barcode === barcode);
      if (position >= 0) untracked(() => this.index.set(position));
    });
  }

  protected previous() {
    this.index.update((index) => Math.max(index - 1, 0));
  }

  protected next() {
    this.index.update((index) => Math.min(index + 1, this.items().length - 1));
  }

  protected onPointerDown(event: PointerEvent) {
    this.pointerStartX = event.clientX;
    (event.currentTarget as Element | null)?.setPointerCapture(event.pointerId);
  }

  protected onPointerUp(event: PointerEvent) {
    const startX = this.pointerStartX;
    this.pointerStartX = null;
    if (startX === null) return;
    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) < swipeThreshold) return;
    if (deltaX < 0) this.next();
    else this.previous();
  }

  protected onPointerCancel() {
    this.pointerStartX = null;
  }
}
