import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { isWarehouse, type Warehouse } from '../../models/warehouse.model';
import { WarehouseApiService } from '../api/warehouse-api.service';

/** Clave de localStorage. Solo guarda id, código y nombre de la última bodega. */
export const WAREHOUSE_STORAGE_KEY = 'rasi.tomaFisica.bodega';

export type ContinueResult = 'ok' | 'missing' | 'not-found' | 'error';

/**
 * Bodega de trabajo: única fuente de verdad para toda la aplicación.
 *
 * - `saved`: última bodega usada (persistida). Solo habilita "Ya tengo bodega".
 * - `active`: bodega en uso. Empieza vacía en cada apertura; se establece al
 *   seleccionar una bodega del catálogo o al continuar con la guardada (tras
 *   verificar que sigue existiendo). Las rutas principales y las consultas de
 *   inventario dependen de ella.
 */
@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private readonly api = inject(WarehouseApiService);
  private readonly storage = storageFrom(inject(DOCUMENT).defaultView);

  private readonly savedState = signal<Warehouse | null>(this.readStored());
  private readonly activeState = signal<Warehouse | null>(null);

  readonly saved = this.savedState.asReadonly();
  readonly active = this.activeState.asReadonly();
  readonly activeId = computed(() => this.activeState()?.id ?? null);

  /** Selección desde el catálogo: activa, recuerda y persiste la bodega. */
  select(warehouse: Warehouse) {
    if (!isWarehouse(warehouse)) throw new Error('Bodega inválida.');
    const clean: Warehouse = { id: warehouse.id, code: warehouse.code, name: warehouse.name };
    this.write(clean);
    this.savedState.set(clean);
    this.activeState.set(clean);
  }

  /**
   * "Ya tengo bodega": confirma contra el catálogo que la bodega guardada
   * existe antes de activarla. Si ya no existe, se olvida.
   */
  async continueWithSaved(): Promise<ContinueResult> {
    const saved = this.savedState();
    if (!saved) return 'missing';

    let current: Warehouse | null;
    try {
      current = await this.api.getById(saved.id);
    } catch {
      return 'error';
    }

    if (!current || !isWarehouse(current)) {
      this.forget();
      return 'not-found';
    }
    // El catálogo manda: nombre y código se refrescan si cambiaron.
    this.select(current);
    return 'ok';
  }

  private forget() {
    try {
      this.storage?.removeItem(WAREHOUSE_STORAGE_KEY);
    } catch {
      // Almacenamiento no disponible (modo privado, WebView restringida).
    }
    this.savedState.set(null);
  }

  private readStored(): Warehouse | null {
    try {
      const raw = this.storage?.getItem(WAREHOUSE_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return isWarehouse(parsed) ? { id: parsed.id, code: parsed.code, name: parsed.name } : null;
    } catch {
      return null;
    }
  }

  private write(warehouse: Warehouse) {
    try {
      this.storage?.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(warehouse));
    } catch {
      // Sin persistencia la bodega sigue activa durante esta apertura.
    }
  }
}

function storageFrom(view: Window | null): Storage | null {
  try {
    return view?.localStorage ?? null;
  } catch {
    return null;
  }
}
