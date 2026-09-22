/** Respuesta de GET /api/products/:barcode (base local de productos). */
export interface Product {
  id: number;
  barcode: string;
  name: string;
  description?: string | null;
  status: boolean;
}
