import type { RequestHandler } from "express";
import * as productsService from "../services/products.service.js";
import type { CreateProductInput, UpdateProductInput } from "../types/product.js";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function routeParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : value?.[0] || null;
}

export const list: RequestHandler = async (_request, response) => {
  const products = await productsService.listProducts();
  response.json({ data: products, error: null });
};

export const getByBarcode: RequestHandler = async (request, response) => {
  const barcode = routeParam(request.params.barcode);
  if (!barcode) {
    response.status(400).json({ data: null, error: { message: "El barcode es obligatorio." } });
    return;
  }
  const product = await productsService.findProductByBarcode(barcode);

  if (!product) {
    response.status(404).json({
      data: null,
      error: { message: "Producto no encontrado" }
    });
    return;
  }

  response.json({ data: product, error: null });
};

export const create: RequestHandler = async (request, response) => {
  const body = request.body as Partial<CreateProductInput>;
  if (!isNonEmptyString(body.barcode) || !isNonEmptyString(body.name) || typeof body.status !== "boolean") {
    response.status(400).json({
      data: null,
      error: { message: "barcode, name y status son obligatorios." }
    });
    return;
  }

  const product = await productsService.createProduct({
    barcode: body.barcode.trim(),
    name: body.name.trim(),
    description: body.description ?? null,
    status: body.status
  });
  response.status(201).json({ data: product, error: null });
};

export const update: RequestHandler = async (request, response) => {
  const id = parseId(routeParam(request.params.id) || "");
  if (!id) {
    response.status(400).json({ data: null, error: { message: "El id debe ser un entero positivo." } });
    return;
  }

  const body = request.body as Partial<UpdateProductInput>;
  if (body.barcode !== undefined && !isNonEmptyString(body.barcode)) {
    response.status(400).json({ data: null, error: { message: "barcode debe ser un texto no vacío." } });
    return;
  }
  if (body.name !== undefined && !isNonEmptyString(body.name)) {
    response.status(400).json({ data: null, error: { message: "name debe ser un texto no vacío." } });
    return;
  }
  if (body.status !== undefined && typeof body.status !== "boolean") {
    response.status(400).json({ data: null, error: { message: "status debe ser booleano." } });
    return;
  }

  const product = await productsService.updateProduct(id, {
    ...body,
    barcode: body.barcode?.trim(),
    name: body.name?.trim()
  });
  if (!product) {
    response.status(404).json({ data: null, error: { message: "Producto no encontrado" } });
    return;
  }
  response.json({ data: product, error: null });
};

export const remove: RequestHandler = async (request, response) => {
  const id = parseId(routeParam(request.params.id) || "");
  if (!id) {
    response.status(400).json({ data: null, error: { message: "El id debe ser un entero positivo." } });
    return;
  }

  const deleted = await productsService.deleteProduct(id);
  if (!deleted) {
    response.status(404).json({ data: null, error: { message: "Producto no encontrado" } });
    return;
  }
  response.json({ data: { deleted: true }, error: null });
};
