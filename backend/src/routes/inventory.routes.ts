import { Router } from "express";
import { getByBarcode } from "../controllers/inventory.controller.js";

export const inventoryRouter = Router();

inventoryRouter.get("/barcode/:barcode", getByBarcode);