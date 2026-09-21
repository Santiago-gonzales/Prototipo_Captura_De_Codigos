import type { ErrorRequestHandler } from "express";

interface DatabaseError extends Error {
  code?: string;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const databaseError = error as DatabaseError;
  const statusCode = databaseError.code === "23505" ? 409 : 500;
  const message = databaseError.code === "23505"
    ? "El barcode ya existe."
    : "Error interno del servidor.";

  console.error(error);
  response.status(statusCode).json({
    data: null,
    error: { message }
  });
};
