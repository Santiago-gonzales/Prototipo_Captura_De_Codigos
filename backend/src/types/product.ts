export interface Product {
  id: number;
  barcode: string;
  name: string;
  description: string | null;
  status: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProductInput {
  barcode: string;
  name: string;
  description?: string | null;
  status: boolean;
}

export interface UpdateProductInput {
  barcode?: string;
  name?: string;
  description?: string | null;
  status?: boolean;
}
