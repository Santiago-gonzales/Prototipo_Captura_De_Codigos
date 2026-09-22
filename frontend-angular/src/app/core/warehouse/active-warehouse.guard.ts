import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { WarehouseService } from './warehouse.service';

/** La aplicación principal (cámara, Zebra, consultas) solo existe con una bodega activa. */
export const activeWarehouseGuard: CanMatchFn = () =>
  inject(WarehouseService).active() ? true : inject(Router).createUrlTree(['/start']);
