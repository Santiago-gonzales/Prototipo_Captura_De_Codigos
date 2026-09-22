import { Injectable, inject, signal } from '@angular/core';
import type { LookupStatus } from '../../models/lookup-status.model';
import type { Product } from '../../models/product.model';
import { ProductApiService } from '../api/product-api.service';

/**
 * Port de la consulta de producto de `App.tsx`:
 * - cache por barcode que también recuerda "no encontrado" (`null`);
 * - una sola petición en vuelo por barcode;
 * - secuencia para que solo la consulta más reciente actualice el estado activo.
 *
 * La cache no se limpia con "Limpiar sesión" (mismo comportamiento que React).
 */
@Injectable({ providedIn: 'root' })
export class ProductLookupService {
  private readonly api = inject(ProductApiService);
  private readonly cache = new Map<string, Product | null>();
  private readonly pending = new Set<string>();
  private requestSequence = 0;

  private readonly activeBarcodeState = signal<string | null>(null);
  private readonly activeProductState = signal<Product | null>(null);
  private readonly statusState = signal<LookupStatus>('idle');

  /** Último barcode consultado (o servido desde cache). */
  readonly activeBarcode = this.activeBarcodeState.asReadonly();
  readonly activeProduct = this.activeProductState.asReadonly();
  readonly status = this.statusState.asReadonly();

  has(barcode: string) {
    return this.cache.has(barcode);
  }

  get(barcode: string): Product | null | undefined {
    return this.cache.get(barcode);
  }

  /**
   * Resuelve el producto de un barcode recién capturado.
   * Devuelve el producto solo cuando llega una respuesta nueva del backend,
   * para que la sesión actualice sus ítems; `undefined` en cualquier otro caso.
   */
  async resolve(barcode: string): Promise<{ product: Product | null } | undefined> {
    if (this.cache.has(barcode)) {
      const cached = this.cache.get(barcode) ?? null;
      this.activeBarcodeState.set(barcode);
      this.activeProductState.set(cached);
      this.statusState.set(cached ? 'found' : 'not-found');
      return undefined;
    }

    if (this.pending.has(barcode)) {
      return undefined;
    }

    this.pending.add(barcode);
    const requestSequence = ++this.requestSequence;
    this.activeBarcodeState.set(barcode);
    this.activeProductState.set(null);
    this.statusState.set('loading');

    try {
      const result = await this.api.getByBarcode(barcode);
      this.cache.set(barcode, result);
      if (requestSequence === this.requestSequence) {
        this.activeProductState.set(result);
        this.statusState.set(result ? 'found' : 'not-found');
      }
      return { product: result };
    } catch {
      if (requestSequence === this.requestSequence) {
        this.statusState.set('error');
      }
      return undefined;
    } finally {
      this.pending.delete(barcode);
    }
  }

  /** Parte de "Limpiar sesión": invalida respuestas en vuelo y el estado activo. */
  reset() {
    this.requestSequence += 1;
    this.pending.clear();
    this.activeProductState.set(null);
    this.activeBarcodeState.set(null);
    this.statusState.set('idle');
  }
}
