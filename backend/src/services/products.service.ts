import { pool } from "../config/database.js";
import type { CreateProductInput, Product, UpdateProductInput } from "../types/product.js";

const productColumns = "id, barcode, name, description, status, created_at, updated_at";

export async function listProducts(): Promise<Product[]> {
  const result = await pool.query<Product>(
    `SELECT ${productColumns} FROM products ORDER BY id ASC`
  );
  return result.rows;
}

export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  const result = await pool.query<Product>(
    `SELECT ${productColumns} FROM products WHERE barcode = $1`,
    [barcode]
  );
  return result.rows[0] || null;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const result = await pool.query<Product>(
    `INSERT INTO products (barcode, name, description, status)
     VALUES ($1, $2, $3, $4)
     RETURNING ${productColumns}`,
    [input.barcode, input.name, input.description ?? null, input.status]
  );
  return result.rows[0];
}

export async function updateProduct(id: number, input: UpdateProductInput): Promise<Product | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.barcode !== undefined) {
    fields.push(`barcode = $${values.length + 1}`);
    values.push(input.barcode);
  }
  if (input.name !== undefined) {
    fields.push(`name = $${values.length + 1}`);
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push(`description = $${values.length + 1}`);
    values.push(input.description);
  }
  if (input.status !== undefined) {
    fields.push(`status = $${values.length + 1}`);
    values.push(input.status);
  }

  if (fields.length === 0) {
    return findProductById(id);
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);
  const result = await pool.query<Product>(
    `UPDATE products SET ${fields.join(", ")} WHERE id = $${values.length}
     RETURNING ${productColumns}`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteProduct(id: number): Promise<boolean> {
  const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);
  return result.rowCount === 1;
}

async function findProductById(id: number): Promise<Product | null> {
  const result = await pool.query<Product>(
    `SELECT ${productColumns} FROM products WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}
