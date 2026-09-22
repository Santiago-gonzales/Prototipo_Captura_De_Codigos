import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WarehouseService, type ContinueResult } from '../../core/warehouse/warehouse.service';

const continueErrors: Record<Exclude<ContinueResult, 'ok'>, string> = {
  missing: 'No hay una bodega guardada. Selecciona una bodega.',
  'not-found': 'La bodega guardada ya no existe en RASI. Selecciona una bodega.',
  error: 'No fue posible verificar la bodega guardada. Revisa la conexión con el servidor e inténtalo de nuevo.'
};

/** Pantalla de arranque: elegir bodega o continuar con la última usada. */
@Component({
  selector: 'app-start-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="start">
      <div class="content">
        <header class="brand">
          <span class="brand-mark">RASI</span>
          <span class="divider" aria-hidden="true"></span>
          <h1>Toma física</h1>
        </header>
        <p class="lead">Elige la bodega en la que vas a trabajar.</p>

        <div class="actions">
          <button type="button" class="btn btn-primary btn-block" (click)="selectWarehouse()">Seleccionar bodega</button>

          @if (warehouse.saved(); as saved) {
            <div class="or" aria-hidden="true"><span>o</span></div>
            <button type="button" class="btn btn-secondary btn-block" [disabled]="busy()" (click)="continueWithSaved()">
              {{ busy() ? 'Verificando bodega…' : 'Ya tengo bodega' }}
            </button>
            <div class="current">
              <span class="label">Bodega actual</span>
              <strong>{{ saved.name }}</strong>
              <span class="code mono">Código {{ saved.code }}</span>
            </div>
          }

          @if (error(); as message) {
            <p class="error" role="alert">{{ message }}</p>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .start {
      display: grid;
      place-items: center;
      height: 100%;
      overflow-y: auto;
      padding: calc(24px + var(--safe-top)) calc(var(--gutter) + var(--safe-right)) calc(24px + var(--safe-bottom)) calc(var(--gutter) + var(--safe-left));
    }
    .content { width: min(400px, 100%); }

    .brand { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .brand-mark { color: var(--color-primary); font: 700 22px var(--font-primary); letter-spacing: 0.06em; }
    .divider { width: 1px; height: 22px; background: var(--color-border-strong); }
    .brand h1 { font-size: 22px; }
    .lead { margin-top: 8px; color: var(--color-text-secondary); font-family: var(--font-secondary); font-size: 13.5px; text-align: center; }

    .actions { display: flex; flex-direction: column; gap: 12px; margin-top: 28px; }
    .or {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--color-text-muted);
      font-size: 12px;
      &::before, &::after { content: ''; flex: 1; height: 1px; background: var(--color-border); }
    }

    .current {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      border-left: 2px solid var(--color-primary);
      background: var(--color-surface);
      strong { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
      .code { color: var(--color-text-muted); font-size: 12px; }
    }

    .error { color: var(--color-error); font-family: var(--font-secondary); font-size: 13px; text-align: center; }

    @media (orientation: landscape) and (max-height: 480px) {
      .start { padding-top: calc(12px + var(--safe-top)); padding-bottom: calc(12px + var(--safe-bottom)); }
      .actions { margin-top: 16px; gap: 8px; }
    }
  `
})
export class StartPage {
  protected readonly warehouse = inject(WarehouseService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected selectWarehouse() {
    void this.router.navigate(['/warehouses']);
  }

  protected async continueWithSaved() {
    this.busy.set(true);
    this.error.set(null);
    const result = await this.warehouse.continueWithSaved();
    this.busy.set(false);
    if (result === 'ok') {
      await this.router.navigate(['/capture'], { replaceUrl: true });
    } else {
      this.error.set(continueErrors[result]);
    }
  }
}
