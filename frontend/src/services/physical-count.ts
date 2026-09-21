import type { CaptureMode } from "../components/CaptureModeSelector";
import type { ScanItem } from "../types/scan";
import type { PhysicalCountItem, PhysicalCountReport } from "../types/physical-count";

export interface PhysicalCountSendResult {
  success: boolean;
  configured: boolean;
  message: string;
}

/**
 * Construye el contrato de dominio a partir del mismo estado que muestra la
 * tabla acumulada. No recalcula ni modifica cantidades del tracker.
 */
export function buildPhysicalCountReport(
  items: ScanItem[],
  captureMode: CaptureMode,
  capturedAt: Date = new Date()
): PhysicalCountReport {
  const reportItems: PhysicalCountItem[] = items.map((item) => ({
    barcode: item.barcode,
    quantity: item.quantity,
    ...(item.product ? {
      productId: item.product.id,
      productName: item.product.name
    } : {})
  }));

  return {
    capturedAt: capturedAt.toISOString(),
    captureMode,
    totalUnits: reportItems.reduce((total, item) => total + item.quantity, 0),
    uniqueCodes: reportItems.length,
    items: reportItems
  };
}

/**
 * Punto de extensión para el futuro endpoint de RASI.
 * Actualmente no realiza ninguna llamada HTTP ni envía datos fuera del
 * navegador.
 */
export async function sendPhysicalCount(
  report: PhysicalCountReport
): Promise<PhysicalCountSendResult> {
  if (report.items.length === 0) {
    return {
      success: false,
      configured: false,
      message: "No hay códigos capturados para enviar a RASI."
    };
  }

  return {
    success: false,
    configured: false,
    message: "El envío a RASI todavía no está configurado."
  };
}
