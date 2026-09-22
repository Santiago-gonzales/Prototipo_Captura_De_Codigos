import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WarehouseService } from '../warehouse/warehouse.service';
import { InventoryLookupService } from './inventory-lookup.service';

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve));

describe('InventoryLookupService', () => {
  let inventory: InventoryLookupService;
  let warehouse: WarehouseService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    inventory = TestBed.inject(InventoryLookupService);
    warehouse = TestBed.inject(WarehouseService);
    http = TestBed.inject(HttpTestingController);
  });

  it('sin bodega activa no hace ninguna consulta de inventario', async () => {
    inventory.ensure('7700304758746');
    await inventory.lookupAnalyzed('7700304758746');

    expect(inventory.entry('7700304758746')).toBeUndefined();
    expect(inventory.analyzedStatus()).toBe('idle');
    http.verify();
  });

  it('consulta el inventario de la bodega activa y separa los resultados por bodega', async () => {
    warehouse.select({ id: 7, code: '2', name: 'INSTITUCIONAL CUC' });
    inventory.ensure('7700304758746');

    const request = http.expectOne((r) => r.url === '/api/inventory/barcode/7700304758746');
    expect(request.request.params.get('bodega')).toBe('7');
    request.flush({
      data: {
        barcode: '7700304758746',
        product: { id: 6740, name: 'Producto de prueba 01', code: 'PRUEBA-7700304758746', usesLot: true, usesSerial: false, status: 'A' },
        lots: [],
        warehouseId: 7,
        warehouseRequired: false
      },
      error: null
    });
    await flushMicrotasks();
    expect(inventory.entry('7700304758746')?.status).toBe('found');

    // Otra bodega: el resultado de la anterior no se reutiliza.
    warehouse.select({ id: 2, code: '1', name: 'COMERCIAL CUC' });
    expect(inventory.entry('7700304758746')).toBeUndefined();
    inventory.ensure('7700304758746');
    expect(http.expectOne((r) => r.url === '/api/inventory/barcode/7700304758746').request.params.get('bodega')).toBe('2');
  });
});
