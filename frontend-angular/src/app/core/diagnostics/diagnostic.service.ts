import { Injectable, signal } from '@angular/core';
import { subscribeDiagnosticEvents, type DiagnosticEvent } from './diagnostic-events';

const maximumEvents = 30;

/**
 * Conserva los últimos eventos del bus de diagnóstico durante toda la vida
 * de la aplicación. En React el panel permanecía montado (oculto); aquí el
 * buffer vive en el servicio para no perder eventos al cambiar de ruta.
 */
@Injectable({ providedIn: 'root' })
export class DiagnosticService {
  private readonly eventsState = signal<DiagnosticEvent[]>([]);
  readonly events = this.eventsState.asReadonly();

  constructor() {
    subscribeDiagnosticEvents((event) => {
      this.eventsState.update((current) => [event, ...current].slice(0, maximumEvents));
    });
  }

  clear() {
    this.eventsState.set([]);
  }
}
