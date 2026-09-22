import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiagnosticService } from './core/diagnostics/diagnostic.service';
import { CaptureSessionService } from './core/session/capture-session.service';
import { MainNav } from './layout/main-nav';

@Component({
  selector: 'app-root',
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
      height: 100dvh;
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
export class App {
  constructor() {
    // Instanciar al arrancar: el diagnóstico debe registrar eventos desde el
    // primer frame y la sesión debe escuchar las fuentes de captura aunque la
    // primera ruta abierta no sea Captura.
    inject(DiagnosticService);
    inject(CaptureSessionService);
  }
}
