/**
 * Interfaz abstracta para proveedores de captura de códigos de barras.
 * 
 * Permite desacoplar la lógica de captura específica (ZXing, Zebra, etc.)
 * del flujo de procesamiento y deduplicación que reside en useScanner.
 * 
 * Cualquier proveedor debe entregar un array de códigos detectados
 * en el frame actual, sin deduplicación ni rearmado.
 */
export interface BarcodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BarcodeDetection {
  barcode: string;
  bounds?: BarcodeBounds;
}

export interface ScannerProvider {
  /**
   * Decodifica un frame de imagen y retorna los códigos detectados.
   * 
   * @param context - Contexto 2D del canvas con la imagen del frame
   * @param width - Ancho de la imagen
   * @param height - Alto de la imagen
  * @returns Detecciones normalizadas, conservando duplicados y posición cuando existe
   */
  decodeFrame(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    frameId?: number
  ): Promise<BarcodeDetection[]>;
}

/**
 * Contrato para fuentes que entregan lecturas como eventos (por ejemplo,
 * DataWedge Intent Output). No sustituye a ScannerProvider: la cámara web
 * sigue siendo un proveedor orientado a frames.
 */
export interface ScannerEventProvider {
  start(onDetection: (detection: BarcodeDetection) => void): void;
  stop(): void;
}
