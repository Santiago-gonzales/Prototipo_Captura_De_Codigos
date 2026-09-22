import { Routes } from '@angular/router';

export const routes: Routes = [
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
  },
  { path: '**', redirectTo: 'capture' }
];
