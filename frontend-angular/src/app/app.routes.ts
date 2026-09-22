import { Routes } from '@angular/router';
import { activeWarehouseGuard } from './core/warehouse/active-warehouse.guard';
import { MainShell } from './layout/main-shell';

export const routes: Routes = [
  {
    path: 'start',
    title: 'RASI - Toma física',
    loadComponent: () => import('./features/start/start-page').then((m) => m.StartPage)
  },
  {
    // Misma pantalla para "Seleccionar bodega" (inicio) y "Cambiar bodega" (Más, ?from=more).
    path: 'warehouses',
    title: 'RASI - Seleccionar bodega',
    loadComponent: () => import('./features/warehouse/warehouse-select-page').then((m) => m.WarehouseSelectPage)
  },
  {
    // Sin bodega activa no se monta la aplicación principal: el guard redirige a /start.
    path: '',
    component: MainShell,
    canMatch: [activeWarehouseGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'capture' },
      {
        path: 'capture',
        title: 'RASI - Captura',
        loadComponent: () => import('./features/capture/capture-page').then((m) => m.CapturePage)
      },
      {
        path: 'registry',
        title: 'RASI - Registro',
        loadComponent: () => import('./features/registry/registry-page').then((m) => m.RegistryPage)
      },
      {
        path: 'product',
        title: 'RASI - Producto',
        loadComponent: () => import('./features/product/product-page').then((m) => m.ProductPage)
      },
      {
        path: 'more',
        title: 'RASI - Más',
        loadComponent: () => import('./features/more/more-page').then((m) => m.MorePage)
      }
    ]
  },
  // Ruta desconocida: a la aplicación principal (o a /start si aún no hay bodega activa).
  { path: '**', redirectTo: '' }
];
