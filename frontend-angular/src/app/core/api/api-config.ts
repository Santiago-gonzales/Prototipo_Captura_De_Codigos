import { InjectionToken } from '@angular/core';

/**
 * Base de la API existente. En desarrollo `/api` pasa por proxy.conf.json
 * hacia http://127.0.0.1:3000 (igual que el proxy de Vite).
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api'
});
