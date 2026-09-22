import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { CaptureEvent } from '../../models/capture-session.model';
import { BarcodeTracker } from './barcode-tracker';
import type { CaptureSource } from './capture-source';
import type { BarcodeDetection, ScannerProvider } from './scanner-provider';
import { ZXingScannerProvider } from './zxing-scanner-provider';

interface DecodedFrame {
  results: BarcodeDetection[];
  frameId: number;
  width: number;
  height: number;
}

/** Último frame analizado, en coordenadas del canvas. Base para el overlay. */
export interface FrameDetections {
  frameId: number;
  width: number;
  height: number;
  detections: BarcodeDetection[];
}

const scanIntervalMs = 500;
const maxFrameWidth = 1280;

/**
 * Port de `useScanner` (React). Mantiene: getUserMedia con cámara trasera,
 * video → canvas → ImageData → ZXing, un frame cada 500 ms, bloqueo contra
 * procesamiento concurrente y BarcodeTracker para emitir solo entidades nuevas.
 *
 * El `<video>` pertenece al servicio y no a un componente: la vista de
 * captura lo toma prestado con `attach()`. Al navegar a otra ruta vuelve a un
 * contenedor estacionado (en el DOM, 1 px, transparente) y la captura continúa,
 * igual que en React, donde las vistas ocultas no se desmontaban.
 */
@Injectable({ providedIn: 'root' })
export class CameraScannerService implements CaptureSource {
  readonly mode = 'camera' as const;

  private readonly document = inject(DOCUMENT);
  private readonly provider: ScannerProvider = new ZXingScannerProvider();
  private readonly tracker = new BarcodeTracker();
  private readonly capturesSubject = new Subject<CaptureEvent>();
  readonly captures$ = this.capturesSubject.asObservable();

  readonly video: HTMLVideoElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly parking: HTMLElement;

  private stream: MediaStream | null = null;
  private isRunning = false;
  private busy = false;
  private inFlight: Promise<unknown> | null = null;
  private lastScan = 0;
  private frameCounter = 0;
  private animationFrame: number | null = null;

  private readonly runningState = signal(false);
  private readonly scanningState = signal(false);
  private readonly analyzingState = signal(false);
  private readonly statusState = signal('Pulsa “Iniciar cámara”.');
  private readonly lastFrameState = signal<FrameDetections | null>(null);

  readonly running = this.runningState.asReadonly();
  readonly scanning = this.scanningState.asReadonly();
  readonly analyzing = this.analyzingState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly lastFrame = this.lastFrameState.asReadonly();

  constructor() {
    this.video = this.document.createElement('video');
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute('muted', '');
    this.video.setAttribute('playsinline', '');
    this.video.className = 'camera-video';

    this.canvas = this.document.createElement('canvas');

    this.parking = this.document.createElement('div');
    this.parking.setAttribute('aria-hidden', 'true');
    Object.assign(this.parking.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      opacity: '0',
      pointerEvents: 'none'
    });
    this.parking.appendChild(this.video);
    this.document.body.appendChild(this.parking);
  }

  /** Inserta el video en el visor visible. */
  attach(host: HTMLElement) {
    host.appendChild(this.video);
    this.resumeIfPaused();
  }

  /** Devuelve el video al contenedor estacionado sin detener el stream. */
  detach(host: HTMLElement) {
    if (this.video.parentElement !== host) return;
    this.parking.appendChild(this.video);
    this.resumeIfPaused();
  }

  async start() {
    try {
      if (!window.isSecureContext) throw new Error('La cámara requiere HTTPS o localhost.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador no permite acceder a la cámara.');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      this.isRunning = true;
      this.runningState.set(true);
      this.statusState.set('Cámara activa. Apunta al código de barras.');
      this.scheduleNextFrame();
    } catch (error) {
      console.error(error);
      this.statusState.set(error instanceof Error ? error.message : 'No fue posible iniciar la cámara.');
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.runningState.set(false);
    this.scanningState.set(false);
    this.lastFrameState.set(null);
    this.statusState.set('Cámara detenida.');
  }

  /**
   * Analiza el frame actual y exige exactamente un código.
   * Toma el mismo bloqueo que el bucle automático: si hay un frame en curso,
   * espera a que termine en lugar de decodificar en paralelo.
   */
  async analyzeCode(): Promise<string | null> {
    if (!this.isRunning || this.analyzingState()) return null;

    this.analyzingState.set(true);
    try {
      if (this.busy && this.inFlight) {
        await this.inFlight.catch(() => undefined);
      }
      if (!this.isRunning) return null;
      this.busy = true;

      this.statusState.set('Analizando código...');
      const { results, frameId } = await this.decodeCurrentFrame();
      console.log(`[CAMERA SNAPSHOT] frame ${frameId}, detections: ${results.length}`);
      if (results.length !== 1) {
        this.statusState.set(results.length === 0
          ? 'No se detectó un código.'
          : 'Asegúrate de mostrar un solo código.');
        return null;
      }
      this.statusState.set('Código detectado. Consultando inventario...');
      return results[0].barcode;
    } catch (error) {
      console.error('Error analizando el código:', error);
      this.statusState.set('Error al analizar el código.');
      return null;
    } finally {
      this.busy = false;
      this.analyzingState.set(false);
    }
  }

  /** Equivalente a `clearAccumulated` de React: reinicia el tracker. */
  clearTracker() {
    this.tracker.clear();
    this.lastFrameState.set(null);
    this.statusState.set(this.isRunning ? 'Resultados limpiados. Continúa la prueba.' : 'Resultados limpiados.');
  }

  getActiveEntityCount() {
    return this.tracker.getActiveEntityCount();
  }

  private resumeIfPaused() {
    if (this.isRunning && this.video.paused) {
      void this.video.play().catch((error) => console.error('No se pudo reanudar el video:', error));
    }
  }

  private scheduleNextFrame() {
    if (!this.isRunning || this.animationFrame !== null) return;
    this.animationFrame = requestAnimationFrame((timestamp) => {
      this.animationFrame = null;
      void this.scanLoop(timestamp);
    });
  }

  private async decodeCurrentFrame(): Promise<DecodedFrame> {
    const video = this.video;
    const canvas = this.canvas;

    if (!video.videoWidth || !video.videoHeight) {
      return { results: [], frameId: ++this.frameCounter, width: 0, height: 0 };
    }

    const scale = Math.min(1, maxFrameWidth / video.videoWidth);
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('No se pudo preparar el canvas.');
    }

    context.drawImage(video, 0, 0, width, height);
    const frameId = ++this.frameCounter;
    const results = await this.provider.decodeFrame(context, width, height, frameId);
    return { results, frameId, width, height };
  }

  private processAutomaticResults(frame: DecodedFrame) {
    const { results, frameId } = frame;
    const trackerInput = results.map((detection) => {
      if (!detection.bounds) {
        return `${detection.barcode} @ bounds:none`;
      }
      const { x, y, width, height } = detection.bounds;
      return `${detection.barcode} @ center=(${(x + width / 2).toFixed(1)}, ${(y + height / 2).toFixed(1)}), size=${width.toFixed(1)}x${height.toFixed(1)}`;
    });
    console.groupCollapsed(`[TRACKER INPUT] frame ${frameId}`);
    console.log(`detections: ${results.length}`);
    for (const detection of trackerInput) console.log(`- ${detection}`);
    console.groupEnd();

    const newValues = this.tracker.update(results, performance.now());
    console.groupCollapsed(`[TRACKER OUTPUT] frame ${frameId}`);
    console.log('newValues:', newValues);
    console.log('activeEntities:', this.tracker.getActiveEntityCount());
    console.groupEnd();

    return { frameCount: results.length, newValues, frameId };
  }

  private async scanLoop(timestamp: number) {
    if (!this.isRunning) {
      return;
    }

    if (!this.busy && timestamp - this.lastScan >= scanIntervalMs) {
      this.lastScan = timestamp;
      this.busy = true;
      this.scanningState.set(true);

      const work = this.decodeCurrentFrame();
      this.inFlight = work;
      try {
        const frame = await work;
        if (this.isRunning) {
          this.lastFrameState.set({
            frameId: frame.frameId,
            width: frame.width,
            height: frame.height,
            detections: frame.results
          });
        }
        const frameSummary = this.processAutomaticResults(frame);
        this.statusState.set(frameSummary.frameCount > 0 ? `${frameSummary.frameCount} código(s) en el frame.` : 'Buscando código...');
        for (const barcode of frameSummary.newValues) {
          this.capturesSubject.next({ barcode, source: 'camera', frameId: frameSummary.frameId });
        }
        if (frameSummary.frameCount > 0) {
          console.log(`[CAMERA FRAME] frame ${frameSummary.frameId}, detections: ${frameSummary.frameCount}`);
        }
      } catch (error) {
        console.error('Error leyendo código:', error);
        this.statusState.set('Error al analizar la imagen.');
      } finally {
        this.inFlight = null;
        this.busy = false;
        this.scanningState.set(false);
      }
    }

    this.scheduleNextFrame();
  }
}
