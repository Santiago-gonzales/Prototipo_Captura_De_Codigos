import { rasiPool } from "../config/database.js";
import type { InventoryBarcodeResult, InventoryLot, InventoryProduct } from "../types/inventory.js";

interface InventoryProductRow {
  id: number;
  name: string;
  code: string;
  usesLot: boolean;
  usesSerial: boolean;
  status: string;
}

interface InventoryLotRow {
  lot: string | null;
  expirationDate: string | null;
  systemQuantity: string | number;
}

export class RasiDatabaseNotConfiguredError extends Error {
  constructor() {
    super("La conexión de consulta a la base RASI no está configurada.");
    this.name = "RasiDatabaseNotConfiguredError";
  }
}

export function isRasiDatabaseConfigured(): boolean {
  return rasiPool !== null;
}

export async function findInventoryByBarcode(
  barcode: string,
  warehouseId: number | null
): Promise<InventoryBarcodeResult | null> {
  if (!rasiPool) {
    throw new RasiDatabaseNotConfiguredError();
  }

  const productResult = await rasiPool.query<InventoryProductRow>(
    `SELECT
      elem_id::integer AS id,
       elem_nombre AS name,
       elem_codigo AS code,
      (elem_usalote::integer = 1) AS "usesLot",
      (elem_usaserial::integer = 1) AS "usesSerial",
       elem_estado AS status
     FROM inventario.elemento
    WHERE elem_codigobarras::text = $1 OR elem_codigobarras2::text = $1
    ORDER BY CASE WHEN elem_codigobarras::text = $1 THEN 0 ELSE 1 END, elem_id
     LIMIT 1`,
    [barcode]
  );

  const product = productResult.rows[0];
  if (!product) {
    return null;
  }

  const lots = warehouseId === null
    ? []
    : await findAvailableLots(product.id, warehouseId);

  return {
    barcode,
    product,
    lots,
    warehouseId,
    warehouseRequired: warehouseId === null
  };
}

async function findAvailableLots(elemId: number, warehouseId: number): Promise<InventoryLot[]> {
  const result = await rasiPool!.query<InventoryLotRow>(
    `SELECT DISTINCT
       sel.sael_lote AS lot,
      TO_CHAR(sel.sael_fecha, 'YYYY-MM-DD') AS "expirationDate",
       sel.sael_cantidadinicial + sel.sael_cantidadentrada - sel.sael_cantidadsalida AS "systemQuantity"
     FROM inventario.saldobodegaelemento AS sbe
     INNER JOIN inventario.saldoelementolote AS sel ON sel.sabe_id = sbe.sabe_id
     WHERE sbe.elem_id = $1
       AND sbe.bode_id = $2
       AND sel.sael_cantidadinicial + sel.sael_cantidadentrada - sel.sael_cantidadsalida > 0
    ORDER BY lot, "expirationDate"`,
    [elemId, warehouseId]
  );

  // No hay un campo de vigencia histórica en estas tablas. DISTINCT elimina
  // filas idénticas, pero conserva filas distintas del mismo lote para no
  // inventar cuál registro histórico sería el vigente.
  return result.rows.map((row) => ({
    lot: row.lot,
    expirationDate: row.expirationDate,
    systemQuantity: Number(row.systemQuantity)
  }));
}