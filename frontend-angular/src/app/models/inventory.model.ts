/** Respuesta de GET /api/inventory/barcode/:barcode?bodega=N (base RASI, solo lectura). */
export interface InventoryLot {
  lot: string | null;
  expirationDate: string | null;
  systemQuantity: number;
}

export interface InventoryProduct {
  id: number;
  name: string;
  code: string;
  usesLot: boolean;
  usesSerial: boolean;
  status: string;
}

export interface InventoryLookup {
  barcode: string;
  product: InventoryProduct;
  lots: InventoryLot[];
  warehouseId: number | null;
  warehouseRequired: boolean;
}
