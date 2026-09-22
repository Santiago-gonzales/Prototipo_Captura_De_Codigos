import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CaptureMode } from '../../models/capture-session.model';

@Component({
  selector: 'app-capture-mode-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" aria-label="Método de captura">
      <button type="button" [class.active]="mode() === 'camera'" [attr.aria-pressed]="mode() === 'camera'" (click)="modeChange.emit('camera')">Cámara</button>
      <button type="button" class="zebra" [class.active]="mode() === 'zebra'" [attr.aria-pressed]="mode() === 'zebra'" (click)="modeChange.emit('zebra')">Zebra</button>
    </div>
  `,
  styles: `
    div {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      padding: 4px;
      border-radius: var(--radius);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
    }
    button {
      min-height: 38px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text-secondary);
      font-weight: 500;
      font-size: 13.5px;
      cursor: pointer;
    }
    button.active { background: var(--color-surface-elevated); color: var(--color-text); font-weight: 600; box-shadow: inset 0 -2px 0 var(--color-primary); }
    /* Zebra usa el acento morado, igual que su indicador de escucha. */
    button.zebra.active { box-shadow: inset 0 -2px 0 var(--color-secondary); }
    button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
  `
})
export class CaptureModeToggle {
  readonly mode = input.required<CaptureMode>();
  readonly modeChange = output<CaptureMode>();
}
