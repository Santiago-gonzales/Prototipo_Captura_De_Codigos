import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CaptureSessionService } from '../../core/session/capture-session.service';
import { formatDuration, formatIsoDate } from '../../shared/formatting';
import { DiagnosticPanel } from './diagnostic-panel';

@Component({
  selector: 'app-more-page',
  imports: [DiagnosticPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-content">
        <header class="page-header"><h1>Más</h1></header>

        <section class="block">
          <h2 class="label">Métricas de captura</h2>
          <dl class="metrics">
            <div><dt>Duración</dt><dd class="mono">{{ duration() }}</dd></div>
            <div><dt>Códigos únicos</dt><dd class="mono">{{ metrics().uniqueCodes }}</dd></div>
            <div><dt>Total unidades</dt><dd class="mono">{{ metrics().totalUnits }}</dd></div>
            <div><dt>Eventos de captura</dt><dd class="mono">{{ metrics().captureEvents }}</dd></div>
          </dl>
          <p class="note">
            Sesión {{ metrics().isActive ? 'activa' : 'finalizada' }} · método {{ metrics().mode === 'camera' ? 'cámara' : 'Zebra' }}
          </p>
        </section>

        <section class="block">
          <h2 class="label">Toma física</h2>
          <dl class="header-info">
            <div><dt>Fecha</dt><dd class="mono">{{ date() }}</dd></div>
            <div><dt>Bodega</dt><dd class="mono">{{ session.header().warehouseId }}</dd></div>
            <div><dt>Observación</dt><dd>{{ session.header().observation || '—' }}</dd></div>
          </dl>
          <p class="note">Encabezado provisional. La bodega es la que usa hoy la consulta de inventario; la creación y el guardado de la toma están pendientes de definición.</p>
        </section>

        <details class="block">
          <summary>Diagnóstico técnico</summary>
          <app-diagnostic-panel />
        </details>

        <details class="block">
          <summary>Información de la prueba</summary>
          <div class="info">
            <p><strong>Objetivo:</strong> validar la captura de códigos con la cámara del dispositivo (varios códigos por imagen) o con un lector Zebra en modo teclado, consolidar cantidades y consultar el producto y su inventario.</p>
            <p>La consulta a RASI es de solo lectura: esta versión no modifica inventarios ni guarda la toma física. El Excel exporta los códigos y cantidades capturados.</p>
          </div>
        </details>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .block {
      margin-bottom: 12px;
      padding: 14px 16px;
      border-radius: var(--radius);
      background: var(--surface);
      border: 1px solid var(--border);
    }
    .block > .label { margin-bottom: 10px; font-family: var(--font-body); }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin: 0;
    }
    @media (min-width: 640px) { .metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .metrics div { padding: 10px 12px; border-radius: var(--radius-sm); background: var(--surface-secondary); }
    dt { color: var(--text-muted); font-size: 11.5px; }
    .metrics dd { margin: 2px 0 0; font-size: 24px; font-weight: 600; }
    .header-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px 16px; margin: 0; }
    .header-info dd { margin: 2px 0 0; font-size: 15px; }
    .note { margin-top: 10px; color: var(--text-muted); font-size: 12px; }
    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 32px;
      font-weight: 600;
      cursor: pointer;
      list-style: none;
    }
    summary::-webkit-details-marker { display: none; }
    summary::after { content: '+'; color: var(--text-muted); font-size: 20px; font-weight: 400; }
    details[open] summary { margin-bottom: 10px; }
    details[open] summary::after { content: '−'; }
    .info { display: flex; flex-direction: column; gap: 8px; color: var(--text-secondary); font-size: 13px; }
    .info strong { color: var(--text); }
  `
})
export class MorePage {
  protected readonly session = inject(CaptureSessionService);
  protected readonly metrics = this.session.metrics;
  protected readonly duration = computed(() => formatDuration(this.session.durationMs()));
  protected readonly date = computed(() => formatIsoDate(this.session.header().date));
}
