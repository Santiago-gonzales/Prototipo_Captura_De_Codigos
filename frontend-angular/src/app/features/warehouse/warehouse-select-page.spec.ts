import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { activeWarehouseGuard } from '../../core/warehouse/active-warehouse.guard';
import { WAREHOUSE_STORAGE_KEY, WarehouseService } from '../../core/warehouse/warehouse.service';
import type { Warehouse } from '../../models/warehouse.model';
import { StartPage } from '../start/start-page';
import { WarehouseSelectPage } from './warehouse-select-page';

@Component({ template: 'página' })
class PageStub {}

const routes: Routes = [
  { path: 'start', component: StartPage },
  { path: 'warehouses', component: WarehouseSelectPage },
  {
    path: '',
    canMatch: [activeWarehouseGuard],
    children: [{ path: 'capture', component: PageStub }, { path: 'more', component: PageStub }]
  }
];

// Extracto real de inventario.bodega.
const catalog: Warehouse[] = [
  { id: 6, code: '1,2', name: 'AVERIAS COMERCIAL CUC' },
  { id: 2, code: '1', name: 'COMERCIAL CUC' },
  { id: 7, code: '2', name: 'INSTITUCIONAL CUC' },
  { id: 28, code: '6,1', name: 'AVERIAS PÑ INSTITUCIONAL' }
];

async function openSelector(url = '/warehouses', setup?: (warehouse: WarehouseService) => void) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes, withComponentInputBinding())]
  });
  const warehouse = TestBed.inject(WarehouseService);
  setup?.(warehouse);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.inject(HttpTestingController).expectOne('/api/warehouses').flush({ data: catalog, error: null });
  await new Promise((resolve) => setTimeout(resolve));
  await harness.fixture.whenStable();
  harness.detectChanges();

  const root = () => harness.routeNativeElement!;
  return {
    harness,
    warehouse,
    router: TestBed.inject(Router),
    names: () => [...root().querySelectorAll('.item strong')].map((element) => element.textContent?.trim()),
    item: (name: string) => [...root().querySelectorAll<HTMLButtonElement>('.item')].find((b) => b.querySelector('strong')?.textContent?.trim() === name)!,
    back: () => root().querySelector<HTMLButtonElement>('button[aria-label="Volver"]')!,
    search: async (text: string) => {
      const input = root().querySelector<HTMLInputElement>('input[type="search"]')!;
      input.value = text;
      input.dispatchEvent(new Event('input'));
      harness.detectChanges();
    }
  };
}

function stored() {
  const raw = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

describe('WarehouseSelectPage', () => {
  beforeEach(() => localStorage.clear());

  it('sin búsqueda lista todas las bodegas del catálogo', async () => {
    const { names } = await openSelector();
    expect(names()).toEqual(catalog.map((item) => item.name));
  });

  it('buscar filtra por nombre (sin distinguir tildes ni mayúsculas) y por código', async () => {
    const { names, search } = await openSelector();

    await search('averías');
    expect(names()).toEqual(['AVERIAS COMERCIAL CUC', 'AVERIAS PÑ INSTITUCIONAL']);

    await search('6,1');
    expect(names()).toEqual(['AVERIAS PÑ INSTITUCIONAL']);

    await search('no existe');
    expect(names()).toEqual([]);

    await search('');
    expect(names()).toHaveLength(catalog.length);
  });

  it('seleccionar una bodega la activa, la persiste y entra a la aplicación', async () => {
    const { item, harness, router, warehouse } = await openSelector();

    item('INSTITUCIONAL CUC').click();
    await harness.fixture.whenStable();

    expect(warehouse.active()).toEqual({ id: 7, code: '2', name: 'INSTITUCIONAL CUC' });
    expect(stored()).toEqual({ id: 7, code: '2', name: 'INSTITUCIONAL CUC' });
    expect(router.url).toBe('/capture');
  });

  it('volver regresa a la pantalla inicial sin modificar la bodega guardada', async () => {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(catalog[1]));
    const { back, harness, router, warehouse } = await openSelector();

    back().click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/start');
    expect(warehouse.active()).toBeNull();
    expect(warehouse.saved()).toEqual(catalog[1]);
    expect(stored()).toEqual(catalog[1]);
  });

  it('"Cambiar bodega" (desde Más) usa la misma pantalla: la nueva bodega reemplaza a la activa', async () => {
    const { item, harness, router, warehouse } = await openSelector('/warehouses?from=more', (service) => service.select(catalog[1]));
    expect(item('COMERCIAL CUC').classList).toContain('current');

    item('INSTITUCIONAL CUC').click();
    await harness.fixture.whenStable();

    expect(warehouse.active()?.id).toBe(7);
    expect(stored()).toEqual(catalog[2]);
    expect(router.url).toBe('/more');
  });

  it('"Cambiar bodega" y volver: regresa a Más con la misma bodega activa', async () => {
    const { back, harness, router, warehouse } = await openSelector('/warehouses?from=more', (service) => service.select(catalog[1]));

    back().click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/more');
    expect(warehouse.active()).toEqual(catalog[1]);
    expect(stored()).toEqual(catalog[1]);
  });
});
