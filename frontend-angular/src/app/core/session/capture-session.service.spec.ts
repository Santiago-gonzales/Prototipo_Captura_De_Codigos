import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import type { CaptureEvent } from '../../models/capture-session.model';
import { CameraScannerService } from '../scanning/camera-scanner.service';
import { CaptureSessionService } from './capture-session.service';

class FakeCamera {
  readonly captures = new Subject<CaptureEvent>();
  readonly captures$ = this.captures.asObservable();
  running = () => false;
  start = vi.fn(async () => undefined);
  stop = vi.fn();
  clearTracker = vi.fn();
  analyzeCode = vi.fn(async () => null as string | null);
}

const product = (barcode: string, status = true) => ({
  id: 1,
  barcode,
  name: `Producto ${barcode}`,
  description: 'Descripción',
  status
});

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve));

function typeZebra(code: string) {
  for (const key of code) window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
}

describe('CaptureSessionService', () => {
  let session: CaptureSessionService;
  let camera: FakeCamera;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined);
    vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);
    camera = new FakeCamera();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CameraScannerService, useValue: camera }
      ]
    });
    session = TestBed.inject(CaptureSessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    session.setMode('camera');
  });

  function answerLookups(barcode: string, found = true) {
    const productRequest = http.expectOne(`/api/products/${barcode}`);
    if (found) productRequest.flush({ data: product(barcode), error: null });
    else productRequest.flush({ data: null, error: { message: 'Producto no encontrado' } }, { status: 404, statusText: 'Not Found' });

    const inventoryRequest = http.expectOne((request) =>
      request.url === `/api/inventory/barcode/${barcode}` && request.params.get('bodega') === '2'
    );
    inventoryRequest.flush(found
      ? {
        data: {
          barcode,
          product: { id: 9, name: 'ELEMENTO RASI', code: 'E-9', usesLot: true, usesSerial: false, status: 'A' },
          lots: [{ lot: 'L1', expirationDate: '2027-01-31', systemQuantity: 18 }],
          warehouseId: 2,
          warehouseRequired: false
        },
        error: null
      }
      : { data: null, error: { message: 'Producto no encontrado' } },
    found ? undefined : { status: 404, statusText: 'Not Found' });
  }

  it('código nuevo → cantidad 1; repetido → incrementa y consolida', async () => {
    camera.captures.next({ barcode: '111', source: 'camera', frameId: 1 });
    answerLookups('111');
    await flushMicrotasks();

    camera.captures.next({ barcode: '111', source: 'camera', frameId: 5 });
    camera.captures.next({ barcode: '222', source: 'camera', frameId: 5 });
    answerLookups('222', false);
    await flushMicrotasks();

    expect(session.items().map((item) => [item.barcode, item.quantity])).toEqual([['111', 2], ['222', 1]]);
    expect(session.items()[0].product?.name).toBe('Producto 111');
    expect(session.items()[1].product).toBeNull();
    expect(session.totalUnits()).toBe(3);
    expect(session.uniqueCodes()).toBe(2);
    expect(session.metrics().captureEvents).toBe(3);
    http.verify();
  });

  it('usa la cache de producto: un código ya consultado no repite la petición', async () => {
    camera.captures.next({ barcode: '111', source: 'camera' });
    answerLookups('111');
    await flushMicrotasks();
    camera.captures.next({ barcode: '111', source: 'camera' });
    await flushMicrotasks();
    http.verify();
  });

  it('valida contra inventario de forma asíncrona sin bloquear la consolidación', async () => {
    camera.captures.next({ barcode: '333', source: 'camera' });
    // La cantidad ya está registrada antes de que respondan las APIs.
    expect(session.items()).toEqual([{ barcode: '333', quantity: 1, product: undefined }]);
    answerLookups('333');
    await flushMicrotasks();
  });

  it('edición manual: valores inválidos o negativos quedan en 0', async () => {
    camera.captures.next({ barcode: '111', source: 'camera' });
    answerLookups('111');
    await flushMicrotasks();

    session.setQuantity('111', 7);
    expect(session.items()[0].quantity).toBe(7);
    session.setQuantity('111', -3);
    expect(session.items()[0].quantity).toBe(0);
    session.setQuantity('111', Number.NaN);
    expect(session.items()[0].quantity).toBe(0);
  });

  it('limpiar sesión finaliza la sesión y reinicia ítems, producto y tracker', async () => {
    camera.captures.next({ barcode: '111', source: 'camera' });
    answerLookups('111');
    await flushMicrotasks();
    expect(session.metrics().isActive).toBe(true);

    session.clear();
    expect(session.items()).toEqual([]);
    expect(session.metrics().isActive).toBe(false);
    expect(session.lastDetectedBarcode()).toBeNull();
    expect(camera.clearTracker).toHaveBeenCalled();
  });

  it('Zebra HID: registra, incrementa, consulta producto e inventario', async () => {
    session.setMode('zebra');
    expect(camera.stop).toHaveBeenCalled();
    expect(session.metrics().isActive).toBe(true);
    expect(session.metrics().mode).toBe('zebra');

    typeZebra('7700304758746');
    answerLookups('7700304758746');
    await flushMicrotasks();
    typeZebra('7700304758746');
    await flushMicrotasks();

    expect(session.items()).toEqual([{ barcode: '7700304758746', quantity: 2, product: product('7700304758746') }]);
    expect(session.lastDetectedBarcode()).toBe('7700304758746');
    http.verify();

    session.setMode('camera');
    expect(session.metrics().isActive).toBe(false);
  });
});
