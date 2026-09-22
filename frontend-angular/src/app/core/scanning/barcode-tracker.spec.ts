import { BarcodeTracker } from './barcode-tracker';
import type { BarcodeDetection } from './scanner-provider';

const frameMs = 500;

function at(barcode: string, x: number, y = 100): BarcodeDetection {
  return { barcode, bounds: { x, y, width: 200, height: 80 } };
}

/** Ejecuta frames consecutivos (cada 500 ms, como el bucle real) y acumula las entidades nuevas. */
function run(tracker: BarcodeTracker, frames: BarcodeDetection[][], startAt = 0) {
  const emitted: string[] = [];
  frames.forEach((detections, index) => {
    emitted.push(...tracker.update(detections, startAt + index * frameMs));
  });
  return emitted;
}

describe('BarcodeTracker (lógica portada sin cambios)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('un mismo código mantenido frente a la cámara se cuenta una sola vez', () => {
    const tracker = new BarcodeTracker();
    const frames = Array.from({ length: 20 }, () => [at('7700304758746', 100)]);
    expect(run(tracker, frames)).toEqual(['7700304758746']);
  });

  it('requiere dos observaciones antes de confirmar una entidad', () => {
    const tracker = new BarcodeTracker();
    expect(tracker.update([at('A', 100)], 0)).toEqual([]);
    expect(tracker.update([at('A', 102)], frameMs)).toEqual(['A']);
  });

  it('una lectura aislada (ruido) no se cuenta', () => {
    const tracker = new BarcodeTracker();
    expect(run(tracker, [[at('A', 100)], [], [], [], [], []])).toEqual([]);
  });

  it('dos códigos diferentes en el mismo frame se cuentan ambos', () => {
    const tracker = new BarcodeTracker();
    const frames = Array.from({ length: 6 }, () => [at('A', 0), at('B', 600)]);
    expect(run(tracker, frames).sort()).toEqual(['A', 'B']);
  });

  it('dos unidades del mismo código visibles a la vez son dos entidades', () => {
    const tracker = new BarcodeTracker();
    const frames = Array.from({ length: 6 }, () => [at('A', 0), at('A', 600)]);
    expect(run(tracker, frames)).toEqual(['A', 'A']);
    expect(tracker.getActiveEntityCount()).toBe(2);
  });

  it('una oclusión breve (< 1500 ms) no vuelve a contar el código', () => {
    const tracker = new BarcodeTracker();
    const frames = [[at('A', 100)], [at('A', 100)], [], [], [at('A', 104)], [at('A', 104)]];
    expect(run(tracker, frames)).toEqual(['A']);
  });

  it('un código que desaparece (≥ 1500 ms) y vuelve a aparecer se cuenta de nuevo', () => {
    const tracker = new BarcodeTracker();
    const frames = [
      [at('A', 100)], [at('A', 100)],
      [], [], [], [], [],
      [at('A', 100)], [at('A', 100)]
    ];
    expect(run(tracker, frames)).toEqual(['A', 'A']);
  });

  it('un movimiento leve del mismo objeto no crea una entidad nueva', () => {
    const tracker = new BarcodeTracker();
    const frames = Array.from({ length: 10 }, (_, index) => [at('A', 100 + index * 12)]);
    expect(run(tracker, frames)).toEqual(['A']);
  });

  it('clear() reinicia entidades para una nueva sesión', () => {
    const tracker = new BarcodeTracker();
    run(tracker, [[at('A', 100)], [at('A', 100)]]);
    tracker.clear();
    expect(tracker.getActiveEntityCount()).toBe(0);
    expect(run(tracker, [[at('A', 100)], [at('A', 100)]], 5000)).toEqual(['A']);
  });
});
