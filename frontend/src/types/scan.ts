import type { Product } from "./product";

export interface ScanItem {
  barcode: string;
  quantity: number;
  product?: Product | null;
}

export interface ScannerStatus {
  message: string;
  active: boolean;
}
