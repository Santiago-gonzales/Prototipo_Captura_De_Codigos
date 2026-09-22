import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiagnosticService } from './core/diagnostics/diagnostic.service';
import { CaptureSessionService } from './core/session/capture-session.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
  styles: `
    :host { display: block; height: 100dvh; }
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
