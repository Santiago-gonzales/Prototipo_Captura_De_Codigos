import type { BarcodeDetection, ScannerEventProvider } from "./scanner-provider";

/**
 * Forma neutral del payload que una futura capa Android puede entregar a la
 * aplicación web embebida. La recepción real del Android Intent ocurre fuera
 * de este frontend (BroadcastReceiver/bridge nativo).
 */
export interface ZebraAndroidIntentPayload {
  action?: string;
  extras: Record<string, unknown>;
}

const DATA_STRING_EXTRA = "com.symbol.datawedge.data_string";
const BARCODES_EXTRA = "com.symbol.datawedge.barcodes";

function readBarcodeBundle(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const data = (entry as Record<string, unknown>)[DATA_STRING_EXTRA] ??
      (entry as Record<string, unknown>)["data_string"];
    return typeof data === "string" && data.trim() ? [data.trim()] : [];
  });
}

/**
 * Adaptador futuro para DataWedge Intent Output.
 *
 * En el navegador no registra BroadcastReceivers ni intenta escuchar Intents.
 * `handleIntentPayload` queda como frontera explícita para el bridge nativo
 * que se añadirá al migrar la aplicación a Android.
 */
export class ZebraAndroidScanner implements ScannerEventProvider {
  readonly availableInWeb = false;
  private onDetection: ((detection: BarcodeDetection) => void) | null = null;

  start(onDetection: (detection: BarcodeDetection) => void) {
    this.onDetection = onDetection;
  }

  stop() {
    this.onDetection = null;
  }

  handleIntentPayload(payload: ZebraAndroidIntentPayload) {
    const extras = payload.extras;
    const multipleValues = readBarcodeBundle(extras[BARCODES_EXTRA]);
    const singleValue = extras[DATA_STRING_EXTRA];
    const values = multipleValues.length > 0
      ? multipleValues
      : typeof singleValue === "string" && singleValue.trim()
        ? [singleValue.trim()]
        : [];

    for (const barcode of values) {
      this.onDetection?.({ barcode });
    }
  }
}
