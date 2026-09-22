import type { InventoryEntry } from '../core/lookup/inventory-lookup.service';
import type { Product } from '../models/product.model';

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface Badge {
  label: string;
  tone: Tone;
}

/** mm:ss, igual que CaptureMetrics en React. */
export function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(Math.max(0, durationMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** YYYY-MM-DD (formato del backend) → DD/MM/YYYY. No transforma otros formatos. */
export function formatIsoDate(value: string | null | undefined) {
  if (!value) return 'No disponible';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** `undefined` = aún sin respuesta (consultando o error de red); `null` = no existe. */
export function productBadge(product: Product | null | undefined): Badge {
  if (product === undefined) return { label: 'Sin confirmar', tone: 'neutral' };
  if (product === null) return { label: 'No encontrado', tone: 'error' };
  return product.status ? { label: 'Activo', tone: 'success' } : { label: 'Inactivo', tone: 'warning' };
}

export function inventoryBadge(entry: InventoryEntry | undefined): Badge | null {
  switch (entry?.status) {
    case 'loading': return { label: 'Validando…', tone: 'info' };
    case 'found': return { label: 'En inventario', tone: 'success' };
    case 'not-found': return { label: 'Sin inventario', tone: 'warning' };
    case 'error': return { label: 'Inventario sin respuesta', tone: 'error' };
    default: return null;
  }
}
