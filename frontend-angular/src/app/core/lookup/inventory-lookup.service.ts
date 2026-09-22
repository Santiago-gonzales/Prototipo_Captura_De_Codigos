import { Injectable, inject, signal } from '@angular/core';
import type { InventoryLookup } from '../../models/inventory.model';
import type { LookupStatus } from '../../models/lookup-status.model';
import { InventoryApiService } from '../api/inventory-api.service';

export interface InventoryEntry {
  status: Exclude<LookupStatus, 'idle'>;
  result: InventoryLookup | null;
}

function cacheKey(warehouseId: number, barcode: string) {
  return `${warehouseId}:${barcode}`;
}

/**
 * Consulta de inventario/lotes contra RASI (solo lectura).
 *
 * Dos usos:
 * 1. `ensure()`: validación automática y asíncrona de cada código capturado
 *    (cámara o Zebra). No bloquea la captura; una petición por bodega+código.
 * 2. `lookupAnalyzed()`: consulta puntual de "Analizar código" (comportamiento
 *    React: siempre consulta de nuevo y publica el resultado como consulta activa).
 */
@Injectable({ providedIn: 'root' })
export class InventoryLookupService {
  private readonly api = inject(InventoryApiService);
  private readonly pending = new Set<string>();
  private readonly entriesState = signal<ReadonlyMap<string, InventoryEntry>>(new Map());
  private generation = 0;

  private readonly analyzedBarcodeState = signal<string | null>(null);
  private readonly analyzedResultState = signal<InventoryLookup | null>(null);
  private readonly analyzedStatusState = signal<LookupStatus>('idle');

  readonly analyzedBarcode = this.analyzedBarcodeState.asReadonly();
  readonly analyzedResult = this.analyzedResultState.asReadonly();
  readonly analyzedStatus = this.analyzedStatusState.asReadonly();

  entry(barcode: string, warehouseId: number): InventoryEntry | undefined {
    return this.entriesState().get(cacheKey(warehouseId, barcode));
  }

  /** Lanza la validación si no existe resultado ni petición en curso. Reintenta tras error. */
  ensure(barcode: string, warehouseId: number) {
    const key = cacheKey(warehouseId, barcode);
    const current = this.entriesState().get(key);
    if (this.pending.has(key) || (current && current.status !== 'error')) return;
    void this.fetchEntry(key, barcode, warehouseId);
  }

  /** Marca el inicio de "Analizar código" (antes de leer el frame). */
  beginAnalyze() {
    this.analyzedStatusState.set('loading');
    this.analyzedResultState.set(null);
  }

  /** "Analizar código" terminó sin un único código válido. */
  cancelAnalyze() {
    this.analyzedStatusState.set('idle');
  }

  async lookupAnalyzed(barcode: string, warehouseId: number) {
    this.analyzedBarcodeState.set(barcode);
    try {
      const result = await this.api.getByBarcode(barcode, warehouseId);
      this.analyzedResultState.set(result);
      this.analyzedStatusState.set(result ? 'found' : 'not-found');
      this.store(cacheKey(warehouseId, barcode), { status: result ? 'found' : 'not-found', result });
    } catch {
      this.analyzedStatusState.set('error');
    }
  }

  /** Olvida las validaciones automáticas (al limpiar la sesión). */
  clearEntries() {
    this.generation += 1;
    this.pending.clear();
    this.entriesState.set(new Map());
  }

  private async fetchEntry(key: string, barcode: string, warehouseId: number) {
    const generation = this.generation;
    this.pending.add(key);
    this.store(key, { status: 'loading', result: null });
    try {
      const result = await this.api.getByBarcode(barcode, warehouseId);
      if (generation !== this.generation) return;
      this.store(key, { status: result ? 'found' : 'not-found', result });
    } catch {
      if (generation !== this.generation) return;
      this.store(key, { status: 'error', result: null });
    } finally {
      if (generation === this.generation) this.pending.delete(key);
    }
  }

  private store(key: string, entry: InventoryEntry) {
    this.entriesState.update((current) => new Map(current).set(key, entry));
  }
}
