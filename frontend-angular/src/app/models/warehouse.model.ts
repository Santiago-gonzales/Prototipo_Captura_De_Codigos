/** Bodega del catálogo RASI (GET /api/warehouses). `id` es `bode_id`, el que usa el inventario. */
export interface Warehouse {
  id: number;
  code: string;
  name: string;
}

export function isWarehouse(value: unknown): value is Warehouse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Warehouse>;
  return Number.isInteger(candidate.id)
    && (candidate.id as number) > 0
    && typeof candidate.code === 'string'
    && typeof candidate.name === 'string'
    && candidate.name.trim().length > 0;
}
