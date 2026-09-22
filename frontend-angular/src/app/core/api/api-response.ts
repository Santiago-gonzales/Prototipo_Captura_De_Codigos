import { HttpErrorResponse } from '@angular/common/http';

/** Sobre `{ data, error }` que devuelve el backend. */
export interface ApiEnvelope<T> {
  data?: T | null;
  error?: { message?: string } | null;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
