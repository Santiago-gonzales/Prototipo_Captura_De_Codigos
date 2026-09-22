import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ZebraHidScannerService } from '../../core/scanning/zebra-hid-scanner.service';

/** Ocupa el lugar del visor cuando la fuente activa es Zebra (teclado/HID). */
@Component({
  selector: 'app-zebra-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state" role="status" aria-live="polite">
      <span class="pulse" [class.on]="listening()" aria-hidden="true"></span>
      {{ listening() ? 'Esperando códigos escaneados…' : 'Lector Zebra inactivo' }}
    </div>
    <div class="code">
      <span class="label">Último código recibido</span>
      <strong class="mono">{{ lastCode() ?? '—' }}</strong>
    </div>
    <p class="hint">Conecta el dispositivo Zebra (modo teclado) y escanea un código de barras.</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
      height: 100%;
      min-height: 0;
      padding: 24px;
      border-radius: var(--radius);
      background: var(--surface);
      border: 1px solid var(--border);
      text-align: center;
    }
    .state { display: inline-flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 13px; }
    .pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); }
    .pulse.on { background: var(--purple); box-shadow: 0 0 0 4px var(--purple-soft); animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: 0.4; } }
    .code { display: flex; flex-direction: column; gap: 6px; max-width: 100%; }
    .code strong { font-size: clamp(22px, 6vw, 34px); font-weight: 600; overflow-wrap: anywhere; }
    .hint { max-width: 36ch; color: var(--text-muted); font-size: 12.5px; }
  `
})
export class ZebraPanel {
  private readonly zebra = inject(ZebraHidScannerService);
  protected readonly listening = this.zebra.listening;
  protected readonly lastCode = this.zebra.lastCode;
}
