import { Router } from "express";
import { create, getByBarcode, list, remove, update } from "../controllers/products.controller.js";

export const productsRouter = Router();

productsRouter.get("/", list);
productsRouter.get("/:barcode", getByBarcode);
productsRouter.post("/", create);
productsRouter.put("/:id", update);
productsRouter.delete("/:id", remove);
