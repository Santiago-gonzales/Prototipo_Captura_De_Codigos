import type { CaptureMode } from "../components/CaptureModeSelector";

export interface PhysicalCountItem {
  barcode: string;
  quantity: number;
  productId?: number;
  productCode?: string;
  productName?: string;
  lot?: string;
  expirationDate?: string;
}

export interface PhysicalCountReport {
  capturedAt: string;
  captureMode: CaptureMode;
  totalUnits: number;
  uniqueCodes: number;
  items: PhysicalCountItem[];
}
