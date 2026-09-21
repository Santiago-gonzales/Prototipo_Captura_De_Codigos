import type { RequestHandler } from "express";
import {
  findInventoryByBarcode,
  isRasiDatabaseConfigured
} from "../services/inventory.service.js";

function routeParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : value?.[0] || null;
}

function parseWarehouse(value: unknown): number | null | undefined {
  if (value === undefined) {
    return null;
  }
  if (typeof value !== "string" || !/^\d+$/.test(value) || Number(value) <= 0) {
    return undefined;
  }
  return Number(value);
}

export const getByBarcode: RequestHandler = async (request, response) => {
  const barcode = routeParam(request.params.barcode)?.trim();
  if (!barcode) {
    response.status(400).json({ data: null, error: { message: "El barcode es obligatorio." } });
    return;
  }

  const warehouseId = parseWarehouse(request.query.bodega);
  if (warehouseId === undefined) {
    response.status(400).json({
      data: null,
      error: { message: "bodega debe ser un entero positivo." }
    });
    return;
  }

  if (!isRasiDatabaseConfigured()) {
    response.status(503).json({
      data: null,
      error: { message: "La conexión de consulta a la base RASI no está configurada." }
    });
    return;
  }

  const inventory = await findInventoryByBarcode(barcode, warehouseId);
  if (!inventory) {
    response.status(404).json({
      data: null,
      error: { message: "Producto no encontrado" }
    });
    return;
  }

  response.json({ data: inventory, error: null });
};