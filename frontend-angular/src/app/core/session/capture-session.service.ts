import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { merge } from 'rxjs';
import type { CaptureEvent, CaptureMode, CaptureSessionMetrics } from '../../models/capture-session.model';
import type { PhysicalCountHeader } from '../../models/physical-count.model';
import type { ScanItem } from '../../models/scan-item.model';
import { emitDiagnosticEvent } from '../diagnostics/diagnostic-events';
import { InventoryLookupService } from '../lookup/inventory-lookup.service';
import { ProductLookupService } from '../lookup/product-lookup.service';
import { CameraScannerService } from '../scanning/camera-scanner.service';
import { ZebraHidScannerService } from '../scanning/zebra-hid-scanner.service';
import { WarehouseService } from '../warehouse/warehouse.service';

const initialSessionMetrics = (mode: CaptureMode): CaptureSessionMetrics => ({
  startedAt: null,
  endedAt: null,
  durationMs: 0,
  mode,
  uniqueCodes: 0,
  totalUnits: 0,
  captureEvents: 0,
  isActive: false
});

function todayIsoDate() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function sumUnits(items: ScanItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Estado de la toma física en curso. Port del estado de `App.tsx`:
 * consolidación por barcode, cantidades, métricas de sesión, modo de captura
 * y limpieza. Las fuentes (cámara, Zebra) solo emiten lecturas; aquí se decide
 * qué hacer con ellas.
 */
@Injectable({ providedIn: 'root' })
export class CaptureSessionService {
  private readonly camera = inject(CameraScannerService);
  private readonly zebra = inject(ZebraHidScannerService);
  private readonly products = inject(ProductLookupService);
  private readonly inventory = inject(InventoryLookupService);
  private readonly warehouse = inject(WarehouseService);

  private barcodeCallbackId = 0;
  private metricsTimer: number | undefined;

  private readonly modeState = signal<CaptureMode>('camera');
  private readonly itemsState = signal<ScanItem[]>([]);
  private readonly metricsState = signal<CaptureSessionMetrics>(initialSessionMetrics('camera'));
  private readonly nowState = signal(Date.now());
  private readonly headerState = signal<Omit<PhysicalCountHeader, 'warehouseId'>>({
    date: todayIsoDate(),
    observation: ''
  });

  readonly mode = this.modeState.asReadonly();
  readonly items = this.itemsState.asReadonly();
  /** La bodega del encabezado es siempre la bodega activa (WarehouseService). */
  readonly header = computed<PhysicalCountHeader>(() => ({
    ...this.headerState(),
    warehouseId: this.warehouse.activeId()
  }));
  readonly totalUnits = computed(() => sumUnits(this.itemsState()));
  readonly uniqueCodes = computed(() => this.itemsState().length);

  /** Métricas visibles: mientras la sesión está activa, códigos y unidades siguen a los ítems. */
  readonly metrics = computed<CaptureSessionMetrics>(() => {
    const metrics = this.metricsState();
    if (!metrics.isActive) return metrics;
    return { ...metrics, uniqueCodes: this.uniqueCodes(), totalUnits: this.totalUnits() };
  });

  readonly durationMs = computed(() => {
    const metrics = this.metricsState();
    const duration = metrics.isActive && metrics.startedAt
      ? this.nowState() - metrics.startedAt.getTime()
      : metrics.durationMs;
    return Math.max(0, duration);
  });

  /** Misma prioridad que React: producto activo → último Zebra → último ítem. */
  readonly lastDetectedBarcode = computed(() =>
    this.products.activeBarcode()
      ?? this.zebra.lastCode()
      ?? this.itemsState().at(-1)?.barcode
      ?? null
  );

  constructor() {
    const subscription = merge(this.camera.captures$, this.zebra.captures$)
      .subscribe((event) => void this.handleCapture(event));

    // Al cambiar de bodega, los códigos ya capturados se validan contra la nueva.
    let previousWarehouseId: number | null = null;
    effect(() => {
      const warehouseId = this.warehouse.activeId();
      untracked(() => {
        if (warehouseId === null || warehouseId === previousWarehouseId) return;
        if (previousWarehouseId !== null) this.inventory.resetAnalyzed();
        previousWarehouseId = warehouseId;
        for (const item of this.itemsState()) this.inventory.ensure(item.barcode);
      });
    });

    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      this.zebra.stop();
      this.finishSession();
    });
  }

  /** Iniciar cámara. La sesión empieza cuando la cámara queda activa. */
  async startCamera() {
    await this.camera.start();
    if (this.modeState() === 'camera' && this.camera.running()) {
      this.beginSession('camera');
    }
  }

  /** Detener cámara. Igual que React: no finaliza la sesión. */
  stopCamera() {
    this.camera.stop();
  }

  /** Cambio de método. Salir de Zebra finaliza su sesión; entrar a Zebra detiene la cámara. */
  setMode(next: CaptureMode) {
    const current = this.modeState();
    if (next === current) return;

    if (current === 'zebra') {
      this.zebra.stop();
      this.finishSession();
    }

    this.modeState.set(next);

    if (next === 'zebra') {
      this.camera.stop();
      this.beginSession('zebra');
      this.zebra.start();
    }
  }

  /** "Analizar código": un único código en el frame → consulta puntual de inventario. */
  async analyzeCode() {
    this.inventory.beginAnalyze();
    const barcode = await this.camera.analyzeCode();
    if (!barcode) {
      this.inventory.cancelAnalyze();
      return null;
    }
    await this.inventory.lookupAnalyzed(barcode);
    return barcode;
  }

  /** Edición manual. Valores no enteros o negativos se guardan como 0 (regla actual). */
  setQuantity(barcode: string, quantity: number) {
    const safeQuantity = Number.isInteger(quantity) && quantity >= 0 ? quantity : 0;
    this.commitItems(this.itemsState().map((item) =>
      item.barcode === barcode ? { ...item, quantity: safeQuantity } : item
    ));
  }

  /** Limpiar sesión: finaliza la sesión activa y reinicia ítems, producto y tracker. */
  clear() {
    this.finishSession();
    this.products.reset();
    this.inventory.clearEntries();
    this.commitItems([]);
    this.camera.clearTracker();
  }

  private async handleCapture(event: CaptureEvent) {
    const { barcode, frameId } = event;
    const callbackId = ++this.barcodeCallbackId;
    emitDiagnosticEvent('ON BARCODE DETECTED', {
      callbackId,
      barcode,
      frameId: frameId ?? '?'
    });
    console.log('[ON BARCODE DETECTED]', {
      callbackId,
      barcode,
      frameId: frameId ?? '?',
      timestamp: new Date().toISOString()
    });

    if (!this.metricsState().isActive) {
      this.beginSession(this.modeState());
    }
    this.metricsState.update((metrics) => ({ ...metrics, captureEvents: metrics.captureEvents + 1 }));

    const hasCachedProduct = this.products.has(barcode);
    const cachedProduct = this.products.get(barcode);
    const items = this.itemsState();
    const previousItem = items.find((item) => item.barcode === barcode);
    const previousQuantity = previousItem?.quantity ?? 0;
    const nextQuantity = previousQuantity + 1;
    const diagnosticDetails = {
      timestamp: new Date().toISOString(),
      frameId: frameId ?? '?',
      barcode,
      previousQuantity,
      newQuantity: nextQuantity,
      productAlreadyExisted: Boolean(previousItem)
    };
    console.log('[APP CAPTURE]', diagnosticDetails);
    emitDiagnosticEvent('APP CAPTURE', diagnosticDetails);

    const nextItems = previousItem
      ? items.map((item) => item.barcode === barcode
        ? { ...item, quantity: nextQuantity, product: hasCachedProduct ? cachedProduct : item.product }
        : item)
      : [...items, { barcode, quantity: 1, product: cachedProduct }];
    console.groupCollapsed('[CAPTURE STATE]');
    console.log('uniqueCodes:', nextItems.length);
    console.log('totalUnits:', sumUnits(nextItems));
    for (const item of nextItems) console.log(`${item.barcode} -> ${item.quantity}`);
    console.groupEnd();
    this.commitItems(nextItems);

    // Validación contra inventario en la bodega activa: asíncrona, no retrasa la captura.
    this.inventory.ensure(barcode);

    const resolved = await this.products.resolve(barcode);
    if (resolved) {
      this.commitItems(this.itemsState().map((item) =>
        item.barcode === barcode ? { ...item, product: resolved.product } : item
      ));
    }
  }

  private beginSession(mode: CaptureMode) {
    const current = this.metricsState();
    if (current.isActive && current.mode === mode) return;
    const startedAt = new Date();
    this.metricsState.set({ ...initialSessionMetrics(mode), startedAt, isActive: true });
    this.nowState.set(startedAt.getTime());
    this.startMetricsTimer();
  }

  private finishSession() {
    const current = this.metricsState();
    if (!current.isActive || !current.startedAt) return;
    const endedAt = new Date();
    const items = this.itemsState();
    this.metricsState.set({
      ...current,
      endedAt,
      durationMs: endedAt.getTime() - current.startedAt.getTime(),
      uniqueCodes: items.length,
      totalUnits: sumUnits(items),
      isActive: false
    });
    this.nowState.set(endedAt.getTime());
    this.stopMetricsTimer();
  }

  private startMetricsTimer() {
    this.stopMetricsTimer();
    this.metricsTimer = window.setInterval(() => this.nowState.set(Date.now()), 1000);
  }

  private stopMetricsTimer() {
    window.clearInterval(this.metricsTimer);
    this.metricsTimer = undefined;
  }

  /** Único punto de escritura de ítems; emite el mismo evento de diagnóstico que React. */
  private commitItems(items: ScanItem[]) {
    this.itemsState.set(items);
    const committedItems = items.map((item) => ({ barcode: item.barcode, quantity: item.quantity }));
    emitDiagnosticEvent('CAPTURED ITEMS COMMITTED', {
      uniqueCodes: items.length,
      totalUnits: sumUnits(items),
      items: committedItems
    });
    console.log('[CAPTURED ITEMS COMMITTED]', committedItems);
  }
}
