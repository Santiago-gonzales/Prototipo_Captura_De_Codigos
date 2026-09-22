import type { Observable } from 'rxjs';
import type { CaptureEvent, CaptureMode } from '../../models/capture-session.model';

/**
 * Contrato común de las fuentes de captura. La cámara (ZXing + BarcodeTracker)
 * y Zebra HID lo implementan hoy. Futuras fuentes (DataWedge Intent,
 * AI Data Capture) deberán emitir por `captures$` sin tocar la sesión.
 *
 * `captures$` entrega lecturas ya confirmadas por la fuente: en cámara,
 * solo entidades nuevas que el tracker aceptó; en Zebra, cada escaneo.
 */
export interface CaptureSource {
  readonly mode: CaptureMode;
  readonly captures$: Observable<CaptureEvent>;
  start(): void | Promise<void>;
  stop(): void;
}
