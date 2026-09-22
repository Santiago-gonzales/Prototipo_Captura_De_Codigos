import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { activeWarehouseGuard } from '../../core/warehouse/active-warehouse.guard';
import { WAREHOUSE_STORAGE_KEY, WarehouseService } from '../../core/warehouse/warehouse.service';
import { WarehouseSelectPage } from '../warehouse/warehouse-select-page';
import { StartPage } from './start-page';

@Component({ template: 'captura' })
class CaptureStub {}

// Mismo esquema que app.routes.ts, con páginas principales simuladas.
const routes: Routes = [
  { path: 'start', component: StartPage },
  { path: 'warehouses', component: WarehouseSelectPage },
  { path: '', canMatch: [activeWarehouseGuard], children: [{ path: 'capture', component: CaptureStub }] },
  { path: '**', redirectTo: '' }
];

const comercialCuc = { id: 2, code: '1', name: 'COMERCIAL CUC' };

async function open(url: string) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes, withComponentInputBinding())]
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return {
    harness,
    http: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
    warehouse: TestBed.inject(WarehouseService),
    button: (label: string) => [...harness.routeNativeElement!.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)
  };
}

describe('StartPage', () => {
  beforeEach(() => localStorage.clear());

  it('primera apertura: la app arranca en la pantalla inicial y solo ofrece seleccionar bodega', async () => {
    const { router, button, harness } = await open('/');

    expect(router.url).toBe('/start');
    expect(harness.routeNativeElement!.textContent).toContain('Toma física');
    expect(button('Seleccionar bodega')).toBeDefined();
    expect(button('Ya tengo bodega')).toBeUndefined();
  });

  it('sin bodega activa no se puede entrar a Captura (sin cámara ni consultas)', async () => {
    const { router } = await open('/capture');
    expect(router.url).toBe('/start');
  });

  it('con bodega guardada muestra "Ya tengo bodega" y la bodega actual', async () => {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(comercialCuc));
    const { button, harness } = await open('/start');

    expect(button('Ya tengo bodega')).toBeDefined();
    expect(harness.routeNativeElement!.textContent).toContain('Bodega actual');
    expect(harness.routeNativeElement!.textContent).toContain('COMERCIAL CUC');
  });

  it('"Seleccionar bodega" abre la pantalla de selección', async () => {
    const { router, button, harness, http } = await open('/start');
    button('Seleccionar bodega')!.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/warehouses');
    http.expectOne('/api/warehouses').flush({ data: [comercialCuc], error: null });
  });

  it('"Ya tengo bodega" entra directamente a la aplicación con la bodega guardada', async () => {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(comercialCuc));
    const { router, button, harness, http, warehouse } = await open('/start');

    button('Ya tengo bodega')!.click();
    http.expectOne('/api/warehouses/2').flush({ data: comercialCuc, error: null });
    await harness.fixture.whenStable();

    expect(warehouse.active()).toEqual(comercialCuc);
    expect(router.url).toBe('/capture');
  });

  it('no permite continuar con una bodega guardada inexistente', async () => {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify({ id: 999, code: 'X', name: 'BODEGA ELIMINADA' }));
    const { router, button, harness, http, warehouse } = await open('/start');

    button('Ya tengo bodega')!.click();
    http.expectOne('/api/warehouses/999').flush({ data: null, error: { message: 'Bodega no encontrada' } }, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(router.url).toBe('/start');
    expect(warehouse.active()).toBeNull();
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')?.textContent).toContain('ya no existe');
    expect(button('Ya tengo bodega')).toBeUndefined();
  });
});
