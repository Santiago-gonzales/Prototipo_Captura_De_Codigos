import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CaptureMode } from '../../models/capture-session.model';

@Component({
  selector: 'app-capture-mode-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" aria-label="Método de captura">
      <button type="button" [class.active]="mode() === 'camera'" [attr.aria-pressed]="mode() === 'camera'" (click)="modeChange.emit('camera')">Cámara</button>
      <button type="button" [class.active]="mode() === 'zebra'" [attr.aria-pressed]="mode() === 'zebra'" (click)="modeChange.emit('zebra')">Zebra</button>
    </div>
  `,
  styles: `
    div {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      padding: 4px;
      border-radius: var(--radius);
      background: var(--surface);
      border: 1px solid var(--border);
    }
    button {
      min-height: 38px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 13.5px;
      cursor: pointer;
    }
    button.active { background: var(--surface-secondary); color: var(--text); box-shadow: inset 0 -2px 0 var(--blue); }
    button:focus-visible { outline: 2px solid var(--blue); outline-offset: -2px; }
  `
})
export class CaptureModeToggle {
  readonly mode = input.required<CaptureMode>();
  readonly modeChange = output<CaptureMode>();
}
