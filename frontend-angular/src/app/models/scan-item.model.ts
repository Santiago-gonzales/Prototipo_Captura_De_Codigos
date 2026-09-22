import type { Product } from './product.model';

/**
 * Elemento consolidado por código de barras.
 * `product` es `undefined` mientras no se ha consultado y `null` si la API no lo encontró.
 */
export interface ScanItem {
  barcode: string;
  quantity: number;
  product?: Product | null;
}
