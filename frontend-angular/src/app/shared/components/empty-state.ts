import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <strong>{{ title() }}</strong>
    @if (message()) { <p>{{ message() }}</p> }
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 32px 20px;
      border: 1px dashed var(--color-border-strong);
      border-radius: var(--radius);
      text-align: center;
    }
    strong { font-family: var(--font-primary); font-size: 15px; font-weight: 600; }
    p { color: var(--color-text-secondary); font-family: var(--font-secondary); font-size: 13px; max-width: 34ch; }
  `
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
