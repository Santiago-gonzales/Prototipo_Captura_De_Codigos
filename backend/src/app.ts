import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { inventoryRouter } from "./routes/inventory.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { warehousesRouter } from "./routes/warehouses.routes.js";

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ data: { status: "ok" }, error: null });
});

app.use("/api/products", productsRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/warehouses", warehousesRouter);
app.use(notFound);
app.use(errorHandler);
