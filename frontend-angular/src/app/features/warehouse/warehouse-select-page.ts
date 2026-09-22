import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WarehouseApiService } from '../../core/api/warehouse-api.service';
import { WarehouseService } from '../../core/warehouse/warehouse.service';
import type { Warehouse } from '../../models/warehouse.model';
import { EmptyState } from '../../shared/components/empty-state';

type LoadStatus = 'loading' | 'ready' | 'error';

/** Minúsculas y sin tildes: "averías" encuentra "AVERIAS". */
function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/**
 * Selector de bodega. Es la misma pantalla para "Seleccionar bodega" (desde
 * /start) y "Cambiar bodega" (desde Más, `?from=more`); solo cambia a dónde
 * vuelve. Volver no modifica la bodega guardada ni la activa.
 */
@Component({
  selector: 'app-warehouse-select-page',
  imports: [EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="select">
      <header class="bar">
        <button type="button" class="back" (click)="back()" aria-label="Volver">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        </button>
        <h1>Seleccionar bodega</h1>
      </header>

      <div class="intro">
        <p class="question">¿En qué bodega trabajarás?</p>
        <label class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <input
            type="search"
            placeholder="Buscar por nombre o código"
            autocomplete="off"
            enterkeyhint="search"
            aria-label="Buscar bodega"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
        </label>
      </div>

      <div class="list-area">
        @switch (status()) {
          @case ('loading') { <p class="state">Cargando bodegas…</p> }
          @case ('error') {
            <div class="state">
              <p class="error">No fue posible cargar las bodegas.</p>
              <button type="button" class="btn btn-secondary" (click)="load()">Reintentar</button>
            </div>
          }
          @case ('ready') {
            <div class="list-head">
              <span class="label">{{ query().trim() ? 'Coincidencias' : 'Bodegas disponibles' }}</span>
              <span class="count mono">{{ filtered().length }}</span>
            </div>
            <ul class="list">
              @for (item of filtered(); track item.id) {
                <li>
                  <button type="button" class="item" [class.current]="item.id === currentId()" (click)="choose(item)">
                    <span class="text">
                      <strong>{{ item.name }}</strong>
                      <span class="code">Código <span class="mono">{{ item.code }}</span></span>
                    </span>
                    @if (item.id === currentId()) { <span class="tag">Actual</span> }
                    <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                  </button>
                </li>
              } @empty {
                <li><app-empty-state title="Sin coincidencias" message="Prueba con otro nombre o código de bodega." /></li>
              }
            </ul>
          }
        }
      </div>
    </section>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .select {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      width: min(640px, 100%);
      height: 100%;
      margin: 0 auto;
      padding: var(--safe-top) var(--safe-right) 0 var(--safe-left);
    }

    .bar {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 56px;
      padding: 4px var(--gutter) 4px 6px;
      border-bottom: 1px solid var(--color-border);
      h1 { min-width: 0; font-size: 18px; }
    }
    .back {
      flex: none;
      display: grid;
      place-items: center;
      width: var(--touch);
      height: var(--touch);
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text);
      cursor: pointer;
      svg { width: 22px; height: 22px; }
      &:hover { background: var(--color-hover-overlay); }
      &:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
    }
    svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

    .intro { display: flex; flex-direction: column; gap: 10px; padding: 14px var(--gutter) 10px; }
    .question { color: var(--color-text-secondary); font-family: var(--font-secondary); font-size: 14px; }
    .search {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: var(--touch);
      padding: 0 12px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text-muted);
      svg { flex: none; width: 18px; height: 18px; }
      &:focus-within { border-color: var(--color-primary); color: var(--color-primary-text); }
    }
    input {
      flex: 1;
      min-width: 0;
      height: 44px;
      border: 0;
      background: transparent;
      color: var(--color-text);
      font-size: 16px;
      outline: none;
      &::placeholder { color: var(--color-text-muted); }
    }

    .list-area { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 var(--gutter) calc(16px + var(--safe-bottom)); }
    .list-head { display: flex; align-items: baseline; justify-content: space-between; padding: 4px 2px 8px; }
    .count { color: var(--color-text-muted); font-size: 12px; }
    .list { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }

    .item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 60px;
      padding: 10px 10px 10px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      text-align: left;
      cursor: pointer;
      transition: border-color 120ms ease, background-color 120ms ease;
      &:hover { border-color: var(--color-border-strong); background: var(--color-surface-elevated); }
      &:active { border-color: var(--color-primary); }
      &:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
      &.current { border-color: var(--color-primary); }
    }
    .text { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; }
    .text strong { font-size: 14.5px; font-weight: 600; overflow-wrap: anywhere; }
    .code { color: var(--color-text-muted); font-size: 12px; }
    .code .mono { color: var(--color-text-secondary); }
    .tag {
      flex: none;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--color-primary-soft);
      color: var(--color-primary-text);
      font-size: 11px;
      font-weight: 600;
    }
    .chevron { flex: none; width: 18px; height: 18px; color: var(--color-text-muted); }

    .state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px 0; color: var(--color-text-secondary); text-align: center; }
    .error { color: var(--color-error); }

    @media (orientation: landscape) and (max-height: 480px) {
      .bar { min-height: 48px; }
      .question { display: none; }
      .intro { padding-top: 8px; padding-bottom: 8px; }
    }
  `
})
export class WarehouseSelectPage {
  private readonly api = inject(WarehouseApiService);
  private readonly warehouse = inject(WarehouseService);
  private readonly router = inject(Router);

  /** Query param opcional: `more` cuando se entra desde "Cambiar bodega". */
  readonly from = input<string>();

  protected readonly status = signal<LoadStatus>('loading');
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly query = signal('');

  protected readonly currentId = computed(() => (this.warehouse.active() ?? this.warehouse.saved())?.id ?? null);

  protected readonly filtered = computed(() => {
    const query = normalize(this.query());
    const all = this.warehouses();
    if (!query) return all;
    return all.filter((item) => normalize(item.name).includes(query) || normalize(item.code).includes(query));
  });

  private readonly fromMore = computed(() => this.from() === 'more' && this.warehouse.active() !== null);

  constructor() {
    void this.load();
  }

  protected async load() {
    this.status.set('loading');
    try {
      this.warehouses.set(await this.api.list());
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }

  protected choose(item: Warehouse) {
    this.warehouse.select(item);
    void this.router.navigate([this.fromMore() ? '/more' : '/capture'], { replaceUrl: true });
  }

  protected back() {
    void this.router.navigate([this.fromMore() ? '/more' : '/start']);
  }
}
