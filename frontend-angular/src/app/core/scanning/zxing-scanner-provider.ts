/**
 * Implementación de ScannerProvider usando ZXing (zxing-wasm).
 * 
 * Responsabilidad única: decodificar frames usando readBarcodes de zxing-wasm
 * y normalizar los resultados a strings.
 */
import { readBarcodes, type ReadResult } from "zxing-wasm/reader";
import type { BarcodeBounds, BarcodeDetection, ScannerProvider } from "./scanner-provider";
import { emitDiagnosticEvent } from "../diagnostics/diagnostic-events";

const readerOptions = {
  tryHarder: true,
  maxNumberOfSymbols: 20
};

function getBounds(result: ReadResult): BarcodeBounds | undefined {
  const points = [
    result.position.topLeft,
    result.position.topRight,
    result.position.bottomLeft,
    result.position.bottomRight
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);

  if (![x, y, right, bottom].every(Number.isFinite) || right <= x || bottom <= y) {
    return undefined;
  }

  return { x, y, width: right - x, height: bottom - y };
}

function normalizeResults(results: ReadResult[]): BarcodeDetection[] {
  return results
    .map((result) => ({ barcode: String(result.text || "").trim(), bounds: getBounds(result) }))
    .filter((result) => Boolean(result.barcode));
}

function formatDetection(detection: BarcodeDetection): string {
  if (!detection.bounds) {
    return `barcode: ${detection.barcode}, bounds: none`;
  }

  const { x, y, width, height } = detection.bounds;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  return `barcode: ${detection.barcode}, bounds: x=${x.toFixed(1)}, y=${y.toFixed(1)}, w=${width.toFixed(1)}, h=${height.toFixed(1)}, center=(${centerX.toFixed(1)}, ${centerY.toFixed(1)})`;
}

export class ZXingScannerProvider implements ScannerProvider {
  async decodeFrame(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    frameId?: number
  ): Promise<BarcodeDetection[]> {
    const imageData = context.getImageData(0, 0, width, height);
    const results = await readBarcodes(imageData, readerOptions);
    const detections = normalizeResults(results);
    if (detections.length > 0) {
      emitDiagnosticEvent("ZXING DETECTIONS", {
        count: detections.length,
        barcodes: detections.map((detection) => detection.barcode)
      });
      console.log(`[ZXING DETECTIONS] count ${detections.length}`);
      detections.forEach((detection, index) => {
        const bounds = detection.bounds;
        console.log(
          `${index + 1}. ${detection.barcode} | x ${bounds?.x ?? "none"} | y ${bounds?.y ?? "none"} | w ${bounds?.width ?? "none"} | h ${bounds?.height ?? "none"}`
        );
      });
    }
    console.groupCollapsed(`[ZXING] frame ${frameId ?? "?"} ${new Date().toISOString()}`);
    console.log(`results: ${detections.length}`);
    for (const detection of detections) {
      console.log(`- ${formatDetection(detection)}`);
    }
    console.groupEnd();
    return detections;
  }
}
