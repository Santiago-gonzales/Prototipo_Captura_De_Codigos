import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Product } from '../../models/product.model';
import { API_BASE_URL } from './api-config';
import { isNotFound, type ApiEnvelope } from './api-response';

@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** GET /products/:barcode. `null` si el backend responde 404. */
  async getByBarcode(barcode: string): Promise<Product | null> {
    try {
      const payload = await firstValueFrom(
        this.http.get<ApiEnvelope<Product>>(`${this.baseUrl}/products/${encodeURIComponent(barcode)}`)
      );
      return payload.data || null;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw new Error('No se pudo consultar el producto.');
    }
  }
}
