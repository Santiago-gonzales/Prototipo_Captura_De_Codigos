export interface InventoryProduct {
  id: number;
  name: string;
  code: string;
  usesLot: boolean;
  usesSerial: boolean;
  status: string;
}

export interface InventoryLot {
  lot: string | null;
  expirationDate: string | null;
  systemQuantity: number;
}

export interface InventoryBarcodeResult {
  barcode: string;
  product: InventoryProduct;
  lots: InventoryLot[];
  warehouseId: number | null;
  warehouseRequired: boolean;
}