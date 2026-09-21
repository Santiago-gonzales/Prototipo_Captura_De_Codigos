import type { RequestHandler } from "express";

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({
    data: null,
    error: { message: "Ruta no encontrada" }
  });
};
