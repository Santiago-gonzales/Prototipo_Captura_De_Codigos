import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Warehouse } from '../../models/warehouse.model';
import { WAREHOUSE_STORAGE_KEY, WarehouseService } from './warehouse.service';

const comercialCuc: Warehouse = { id: 2, code: '1', name: 'COMERCIAL CUC' };
const institucionalCuc: Warehouse = { id: 7, code: '2', name: 'INSTITUCIONAL CUC' };

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve));

function stored() {
  const raw = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** Cada llamada simula una apertura nueva de la aplicación (servicio recién creado). */
function openApp() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { service: TestBed.inject(WarehouseService), http: TestBed.inject(HttpTestingController) };
}

describe('WarehouseService', () => {
  beforeEach(() => localStorage.clear());

  it('primera apertura sin bodega guardada: no hay bodega guardada ni activa', () => {
    const { service } = openApp();
    expect(service.saved()).toBeNull();
    expect(service.active()).toBeNull();
    expect(service.activeId()).toBeNull();
  });

  it('seleccionar bodega: la activa y persiste solo id, código y nombre', () => {
    const { service } = openApp();
    service.select({ ...comercialCuc, extra: 'no se guarda' } as Warehouse);

    expect(service.active()).toEqual(comercialCuc);
    expect(service.activeId()).toBe(2);
    expect(service.saved()).toEqual(comercialCuc);
    expect(stored()).toEqual(comercialCuc);
  });

  it('reapertura con bodega guardada: se recuerda, pero no se activa sin confirmar', () => {
    openApp().service.select(comercialCuc);

    const { service } = openApp();
    expect(service.saved()).toEqual(comercialCuc);
    expect(service.active()).toBeNull();
  });

  it('"Ya tengo bodega" verifica la bodega guardada contra el catálogo y la activa', async () => {
    openApp().service.select(comercialCuc);
    const { service, http } = openApp();

    const result = service.continueWithSaved();
    http.expectOne('/api/warehouses/2').flush({ data: comercialCuc, error: null });

    expect(await result).toBe('ok');
    expect(service.active()).toEqual(comercialCuc);
    http.verify();
  });

  it('una bodega nueva reemplaza por completo a la anterior', () => {
    const { service } = openApp();
    service.select(comercialCuc);
    service.select(institucionalCuc);

    expect(service.active()).toEqual(institucionalCuc);
    expect(stored()).toEqual(institucionalCuc);
    expect(openApp().service.saved()).toEqual(institucionalCuc);
  });

  it('no permite continuar con una bodega guardada que ya no existe: la olvida', async () => {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify({ id: 999, code: 'X', name: 'BODEGA ELIMINADA' }));
    const { service, http } = openApp();

    const result = service.continueWithSaved();
    http.expectOne('/api/warehouses/999').flush(
      { data: null, error: { message: 'Bodega no encontrada' } },
      { status: 404, statusText: 'Not Found' }
    );

    expect(await result).toBe('not-found');
    expect(service.active()).toBeNull();
    expect(service.saved()).toBeNull();
    expect(stored()).toBeNull();
  });

  it('sin respuesta del servidor no activa la bodega guardada, pero la conserva', async () => {
    openApp().service.select(comercialCuc);
    const { service, http } = openApp();

    const result = service.continueWithSaved();
    http.expectOne('/api/warehouses/2').error(new ProgressEvent('error'));
    await flushMicrotasks();

    expect(await result).toBe('error');
    expect(service.active()).toBeNull();
    expect(service.saved()).toEqual(comercialCuc);
  });

  it('ignora datos guardados inválidos y rechaza seleccionar una bodega inválida', async () => {
    for (const raw of ['{no es json', JSON.stringify({ id: 0, code: '1', name: 'X' }), JSON.stringify({ id: 2, code: '1', name: '' }), JSON.stringify({ id: '2', code: '1', name: 'X' })]) {
      localStorage.setItem(WAREHOUSE_STORAGE_KEY, raw);
      const { service } = openApp();
      expect(service.saved()).toBeNull();
      expect(await service.continueWithSaved()).toBe('missing');
      expect(service.active()).toBeNull();
    }

    const { service } = openApp();
    expect(() => service.select({ id: -1, code: '1', name: 'X' })).toThrow();
    expect(() => service.select({ id: 3, code: '1', name: '  ' })).toThrow();
    expect(service.active()).toBeNull();
  });
});
