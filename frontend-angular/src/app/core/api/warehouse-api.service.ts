import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Warehouse } from '../../models/warehouse.model';
import { API_BASE_URL } from './api-config';
import { isNotFound, type ApiEnvelope } from './api-response';

@Injectable({ providedIn: 'root' })
export class WarehouseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** GET /warehouses: catálogo completo de bodegas RASI. */
  async list(): Promise<Warehouse[]> {
    const payload = await firstValueFrom(this.http.get<ApiEnvelope<Warehouse[]>>(`${this.baseUrl}/warehouses`));
    return payload.data ?? [];
  }

  /** GET /warehouses/:id. `null` si el backend responde 404. */
  async getById(id: number): Promise<Warehouse | null> {
    try {
      const payload = await firstValueFrom(this.http.get<ApiEnvelope<Warehouse>>(`${this.baseUrl}/warehouses/${id}`));
      return payload.data || null;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw new Error('No se pudo consultar la bodega.');
    }
  }
}
