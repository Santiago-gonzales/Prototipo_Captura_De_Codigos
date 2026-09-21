import type { Product } from "../types/product";

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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(barcode)}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error("No se pudo consultar el producto.");
    }

    const payload = await response.json() as { data?: Product; error?: { message?: string } };
    return payload.data || null;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("No fue posible consultar el producto.");
    }
    throw error;
  }
}

export async function getInventoryByBarcode(barcode: string, warehouseId = 2): Promise<InventoryLookup | null> {
  const response = await fetch(`${API_BASE_URL}/inventory/barcode/${encodeURIComponent(barcode)}?bodega=${warehouseId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("No se pudo consultar el inventario.");
  }

  const payload = await response.json() as { data?: InventoryLookup; error?: { message?: string } };
  return payload.data || null;
}
