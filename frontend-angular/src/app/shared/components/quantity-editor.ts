import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';

/**
 * Cantidad editable. Conserva la edición directa de React (Enter guarda,
 * Escape cancela; valores inválidos o negativos se guardan como 0) y añade
 * botones −/+ que nunca bajan de 0.
 */
@Component({
  selector: 'app-quantity-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (editing()) {
      <input
        #field
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        [value]="draft()"
        (input)="draft.set($any($event.target).value)"
        (keydown.enter)="save()"
        (keydown.escape)="cancel()"
        (blur)="save()"
        [attr.aria-label]="'Cantidad de ' + label()"
      />
      <button type="button" class="step" (mousedown)="$event.preventDefault()" (click)="save()" aria-label="Guardar cantidad">✓</button>
    } @else {
      <button type="button" class="step" (click)="step(-1)" [disabled]="value() <= 0" [attr.aria-label]="'Restar una unidad a ' + label()">−</button>
      <button type="button" class="value mono" (click)="startEdit()" [attr.aria-label]="'Editar cantidad de ' + label() + ': ' + value()">{{ value() }}</button>
      <button type="button" class="step" (click)="step(1)" [attr.aria-label]="'Sumar una unidad a ' + label()">+</button>
    }
  `,
  styles: `
    :host {
      flex: none;
      display: inline-grid;
      grid-template-columns: 44px minmax(52px, auto) 44px;
      align-items: stretch;
      height: 44px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--surface-secondary);
      overflow: hidden;
    }
    button { border: 0; background: transparent; cursor: pointer; }
    .step { font-size: 20px; color: var(--text-secondary); }
    .step:hover:not(:disabled) { color: var(--text); background: #FFFFFF0A; }
    .step:disabled { opacity: 0.3; cursor: not-allowed; }
    .value {
      padding: 0 6px;
      border-left: 1px solid var(--border);
      border-right: 1px solid var(--border);
      font-size: 18px;
      font-weight: 600;
    }
    input {
      grid-column: 1 / 3;
      width: 100%;
      min-width: 0;
      border: 0;
      padding: 0 10px;
      background: #1061FF14;
      font: 600 18px var(--font-display);
      text-align: center;
      outline: none;
    }
    button:focus-visible { outline: 2px solid var(--blue); outline-offset: -2px; }
  `
})
export class QuantityEditor {
  readonly value = input.required<number>();
  readonly label = input('el elemento');
  readonly valueChange = output<number>();

  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  constructor() {
    effect(() => {
      const element = this.field()?.nativeElement;
      element?.focus();
      element?.select();
    });
  }

  protected startEdit() {
    this.draft.set(String(this.value()));
    this.editing.set(true);
  }

  protected save() {
    if (!this.editing()) return;
    let numValue = parseInt(this.draft(), 10);
    if (isNaN(numValue) || numValue < 0) {
      numValue = 0;
    }
    this.editing.set(false);
    this.valueChange.emit(numValue);
  }

  protected cancel() {
    this.editing.set(false);
  }

  protected step(delta: number) {
    this.valueChange.emit(Math.max(0, this.value() + delta));
  }
}
