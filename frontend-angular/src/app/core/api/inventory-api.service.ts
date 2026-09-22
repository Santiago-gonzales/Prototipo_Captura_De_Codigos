import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { InventoryLookup } from '../../models/inventory.model';
import { API_BASE_URL } from './api-config';
import { isNotFound, type ApiEnvelope } from './api-response';

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** GET /inventory/barcode/:barcode?bodega=N. `null` si el backend responde 404. */
  async getByBarcode(barcode: string, warehouseId: number): Promise<InventoryLookup | null> {
    try {
      const payload = await firstValueFrom(
        this.http.get<ApiEnvelope<InventoryLookup>>(
          `${this.baseUrl}/inventory/barcode/${encodeURIComponent(barcode)}`,
          { params: { bodega: warehouseId } }
        )
      );
      return payload.data || null;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw new Error('No se pudo consultar el inventario.');
    }
  }
}
