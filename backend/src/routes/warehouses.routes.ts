import { Router } from "express";
import { getById, list } from "../controllers/warehouses.controller.js";

export const warehousesRouter = Router();

warehousesRouter.get("/", list);
warehousesRouter.get("/:id", getById);
