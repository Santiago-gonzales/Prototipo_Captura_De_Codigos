export type CaptureMode = 'camera' | 'zebra';

export interface CaptureSessionMetrics {
  startedAt: Date | null;
  endedAt: Date | null;
  durationMs: number;
  mode: CaptureMode;
  uniqueCodes: number;
  totalUnits: number;
  captureEvents: number;
  isActive: boolean;
}

/** Lectura entregada por cualquier fuente de captura (cámara, Zebra HID, futuras). */
export interface CaptureEvent {
  barcode: string;
  source: CaptureMode;
  frameId?: number;
}
