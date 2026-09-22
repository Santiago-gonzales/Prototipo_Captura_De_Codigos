import { rasiPool } from "../config/database.js";
import type { Warehouse } from "../types/warehouse.js";
import { RasiDatabaseNotConfiguredError } from "./inventory.service.js";

// La tabla no tiene columna de estado activo/inactivo: se exponen todas las bodegas.
const warehouseColumns = `bode_id::integer AS id,
       bode_codigo AS code,
       bode_nombre AS name`;

export async function listWarehouses(): Promise<Warehouse[]> {
  if (!rasiPool) {
    throw new RasiDatabaseNotConfiguredError();
  }

  const result = await rasiPool.query<Warehouse>(
    `SELECT ${warehouseColumns}
     FROM inventario.bodega
     ORDER BY bode_nombre`
  );
  return result.rows;
}

export async function findWarehouseById(id: number): Promise<Warehouse | null> {
  if (!rasiPool) {
    throw new RasiDatabaseNotConfiguredError();
  }

  const result = await rasiPool.query<Warehouse>(
    `SELECT ${warehouseColumns}
     FROM inventario.bodega
     WHERE bode_id = $1`,
    [id]
  );
  return result.rows[0] || null;
}
