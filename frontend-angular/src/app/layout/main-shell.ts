import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MainNav } from './main-nav';

/** Aplicación principal (Captura, Registro, Producto, Más). Solo se monta con bodega activa. */
@Component({
  selector: 'app-main-shell',
  imports: [RouterOutlet, MainNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="app-main">
      <router-outlet />
    </main>
    <app-main-nav class="app-nav" />
  `,
  styles: `
    :host {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      grid-template-areas: "main" "nav";
      height: 100%;
      padding-top: var(--safe-top);
    }
    .app-main { grid-area: main; min-height: 0; min-width: 0; padding: 0 var(--safe-right) 0 var(--safe-left); }
    .app-nav { grid-area: nav; }

    @media (orientation: landscape) and (max-height: 600px) {
      :host {
        grid-template-rows: minmax(0, 1fr);
        grid-template-columns: auto minmax(0, 1fr);
        grid-template-areas: "nav main";
        padding-top: 0;
      }
      .app-main { padding: var(--safe-top) var(--safe-right) var(--safe-bottom) 0; }
    }
  `
})
export class MainShell {}
