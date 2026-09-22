import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InventoryLookupService } from '../../core/lookup/inventory-lookup.service';
import { CameraScannerService } from '../../core/scanning/camera-scanner.service';
import { CaptureSessionService } from '../../core/session/capture-session.service';
import { formatDuration } from '../../shared/formatting';
import { CameraViewport } from './camera-viewport';
import { CaptureModeToggle } from './capture-mode-toggle';
import { LastReading } from './last-reading';
import { ZebraPanel } from './zebra-panel';

@Component({
  selector: 'app-capture-page',
  imports: [CameraViewport, CaptureModeToggle, LastReading, ZebraPanel, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './capture-page.html',
  styleUrl: './capture-page.scss'
})
export class CapturePage {
  protected readonly session = inject(CaptureSessionService);
  protected readonly camera = inject(CameraScannerService);
  protected readonly inventory = inject(InventoryLookupService);

  protected readonly mode = this.session.mode;
  protected readonly duration = computed(() => formatDuration(this.session.durationMs()));
  protected readonly sessionActive = computed(() => this.session.metrics().isActive);

  protected readonly sessionLabel = computed(() => {
    if (this.mode() === 'zebra') return 'Zebra activo';
    if (this.camera.running()) return 'Capturando';
    return this.sessionActive() ? 'En pausa' : 'Detenida';
  });

  protected readonly live = computed(() => this.mode() === 'zebra' || this.camera.running());

  protected readonly analyzeDisabled = computed(() =>
    this.mode() !== 'camera' || !this.camera.running() || this.camera.analyzing()
  );

  protected toggleCamera() {
    if (this.camera.running()) {
      this.session.stopCamera();
    } else {
      void this.session.startCamera();
    }
  }

  protected analyze() {
    void this.session.analyzeCode();
  }
}
