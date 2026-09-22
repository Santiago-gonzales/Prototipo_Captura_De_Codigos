import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

// Trazos SVG propios para no depender de una librería de iconos.
const NAV_ITEMS: NavItem[] = [
  { path: '/capture', label: 'Captura', icon: 'M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 8v8M11 8v8M14 8v8M17 8v8' },
  { path: '/registry', label: 'Registro', icon: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01' },
  { path: '/product', label: 'Producto', icon: 'M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8' },
  { path: '/more', label: 'Más', icon: 'M5 12h.01M12 12h.01M19 12h.01' }
];

@Component({
  selector: 'app-main-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Navegación principal">
      @for (item of items; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: `
    :host { display: block; background: var(--color-surface); border-top: 1px solid var(--color-border); }
    nav {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      height: calc(var(--nav-height) + var(--safe-bottom));
      padding: 0 var(--safe-right) var(--safe-bottom) var(--safe-left);
    }
    a {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: var(--color-text-muted);
      font-size: 11px;
      font-weight: 500;
      text-decoration: none;
      border-top: 2px solid transparent;
    }
    a.active { color: var(--color-text); font-weight: 600; border-top-color: var(--color-primary); }
    a.active svg { stroke: var(--color-primary-text); }
    a:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -4px; }
    svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

    /* Teléfono en horizontal: riel lateral para no restar altura a la cámara. */
    @media (orientation: landscape) and (max-height: 600px) {
      :host { height: 100%; border-top: 0; border-right: 1px solid var(--color-border); }
      nav {
        grid-template-columns: 1fr;
        grid-auto-rows: 1fr;
        width: calc(76px + var(--safe-left));
        height: 100%;
        padding: var(--safe-top) 0 var(--safe-bottom) var(--safe-left);
      }
      a { border-top: 0; border-left: 2px solid transparent; }
      a.active { border-left-color: var(--color-primary); }
    }
  `
})
export class MainNav {
  protected readonly items = NAV_ITEMS;
}
