import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  viewChild
} from '@angular/core';
import { CameraScannerService } from '../../core/scanning/camera-scanner.service';

/**
 * Visor de cámara. No contiene lógica de captura: toma prestado el `<video>`
 * de CameraScannerService y dibuja encima el estado y las detecciones.
 *
 * El overlay usa un SVG con el mismo sistema de coordenadas del canvas que
 * analiza ZXing y `preserveAspectRatio="xMidYMid meet"`, equivalente exacto
 * a `object-fit: cover` del video. Es solo visual: no altera la lectura.
 */
@Component({
  selector: 'app-camera-viewport',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #videoHost class="video-host"></div>

    @if (frame(); as f) {
      <svg class="overlay" [attr.viewBox]="'0 0 ' + f.width + ' ' + f.height" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        @for (box of boxes(); track $index) {
          <rect [attr.x]="box.x" [attr.y]="box.y" [attr.width]="box.width" [attr.height]="box.height" rx="4" />
        }
      </svg>
    }

    <span class="corner tl" aria-hidden="true"></span>
    <span class="corner tr" aria-hidden="true"></span>
    <span class="corner bl" aria-hidden="true"></span>
    <span class="corner br" aria-hidden="true"></span>

    @if (!running()) {
      <div class="idle">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="12.5" r="3.5"/></svg>
        <span>{{ status() }}</span>
      </div>
    }

    <div class="status" [class.hot]="detectionCount() > 0" role="status" aria-live="polite">
      <span class="pulse" [class.on]="running()" aria-hidden="true"></span>
      <span class="text">{{ running() ? status() : 'Cámara detenida' }}</span>
      @if (running()) {
        <span class="count mono" title="Códigos en el último frame">{{ detectionCount() }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      border-radius: var(--radius);
      background: var(--color-camera);
      isolation: isolate;
    }
    .video-host, .overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
    .video-host ::ng-deep video { display: block; width: 100%; height: 100%; object-fit: contain; }
    .overlay { pointer-events: none; }
    .overlay rect { fill: var(--color-primary-soft); stroke: var(--color-primary-bright); stroke-width: 3; vector-effect: non-scaling-stroke; }

    .corner { position: absolute; width: 22px; height: 22px; border: 0 solid var(--color-text-secondary); pointer-events: none; }
    .tl { top: 12px; left: 12px; border-width: 2px 0 0 2px; border-top-left-radius: 6px; }
    .tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; border-top-right-radius: 6px; }
    .bl { bottom: 12px; left: 12px; border-width: 0 0 2px 2px; border-bottom-left-radius: 6px; }
    .br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; border-bottom-right-radius: 6px; }

    .idle {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 24px;
      color: var(--color-text-secondary);
      text-align: center;
      font-size: 13px;
    }
    .idle svg { width: 36px; height: 36px; fill: none; stroke: currentColor; stroke-width: 1.4; opacity: 0.7; }

    .status {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      max-width: calc(100% - 24px);
      margin: 0 auto;
      padding: 7px 12px;
      border-radius: 999px;
      background: var(--color-overlay);
      backdrop-filter: blur(6px);
      font-size: 12.5px;
      font-weight: 500;
    }
    .status .text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status.hot { box-shadow: inset 0 0 0 1px var(--color-primary); }
    .count {
      min-width: 22px;
      padding: 0 6px;
      border-radius: 999px;
      background: var(--color-primary);
      font-size: 12px;
      font-weight: 600;
      text-align: center;
    }
    .pulse { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--color-text-muted); }
    .pulse.on { background: var(--color-success); animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: 0.35; } }
  `
})
export class CameraViewport {
  private readonly camera = inject(CameraScannerService);
  private readonly videoHost = viewChild.required<ElementRef<HTMLElement>>('videoHost');

  protected readonly running = this.camera.running;
  protected readonly status = this.camera.status;
  protected readonly frame = computed(() => {
    const frame = this.camera.lastFrame();
    return frame && frame.width > 0 ? frame : null;
  });
  protected readonly boxes = computed(() =>
    (this.frame()?.detections ?? []).flatMap((detection) => detection.bounds ? [detection.bounds] : [])
  );
  protected readonly detectionCount = computed(() => this.frame()?.detections.length ?? 0);

  constructor() {
    afterNextRender(() => this.camera.attach(this.videoHost().nativeElement));
    inject(DestroyRef).onDestroy(() => this.camera.detach(this.videoHost().nativeElement));
  }
}
