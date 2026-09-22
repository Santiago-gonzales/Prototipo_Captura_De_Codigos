import type { RequestHandler, Response } from "express";
import { isRasiDatabaseConfigured } from "../services/inventory.service.js";
import * as warehousesService from "../services/warehouses.service.js";

function routeParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : value?.[0] || null;
}

function parseId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value) || Number(value) <= 0) {
    return null;
  }
  return Number(value);
}

function rasiNotConfigured(response: Response) {
  response.status(503).json({
    data: null,
    error: { message: "La conexión de consulta a la base RASI no está configurada." }
  });
}

export const list: RequestHandler = async (_request, response) => {
  if (!isRasiDatabaseConfigured()) {
    rasiNotConfigured(response);
    return;
  }

  const warehouses = await warehousesService.listWarehouses();
  response.json({ data: warehouses, error: null });
};

export const getById: RequestHandler = async (request, response) => {
  const id = parseId(routeParam(request.params.id));
  if (!id) {
    response.status(400).json({ data: null, error: { message: "El id debe ser un entero positivo." } });
    return;
  }

  if (!isRasiDatabaseConfigured()) {
    rasiNotConfigured(response);
    return;
  }

  const warehouse = await warehousesService.findWarehouseById(id);
  if (!warehouse) {
    response.status(404).json({ data: null, error: { message: "Bodega no encontrada" } });
    return;
  }

  response.json({ data: warehouse, error: null });
};
