import type { CaptureMode } from './capture-session.model';

/**
 * Encabezado de una toma física según RASI: fecha, observación y bodega.
 * PENDIENTE (negocio): reglas de creación y guardado.
 */
export interface PhysicalCountHeader {
  /** Fecha de la toma en formato YYYY-MM-DD. */
  date: string;
  observation: string;
  /** Bodega activa (`bode_id`). `null` solo antes de seleccionar bodega. */
  warehouseId: number | null;
}

/**
 * Detalle previsto de la toma. Los campos de lote/vencimiento quedan opcionales
 * hasta que negocio confirme cómo se asigna el conteo físico a cada lote.
 */
export interface PhysicalCountItem {
  barcode: string;
  quantity: number;
  productId?: number;
  productCode?: string;
  productName?: string;
  warehouseId?: number;
  lot?: string;
  expirationDate?: string;
}

export interface PhysicalCountReport {
  capturedAt: string;
  captureMode: CaptureMode;
  header?: PhysicalCountHeader;
  totalUnits: number;
  uniqueCodes: number;
  items: PhysicalCountItem[];
}
