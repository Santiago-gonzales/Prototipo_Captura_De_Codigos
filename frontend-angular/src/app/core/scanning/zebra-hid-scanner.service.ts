import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { CaptureEvent } from '../../models/capture-session.model';
import type { CaptureSource } from './capture-source';
import { ZebraKeyboardScanner } from './zebra-keyboard-scanner';

/**
 * Fuente Zebra en modo teclado/HID: el lector escribe el código como teclas
 * y `ZebraKeyboardScanner` (sin cambios respecto a React) lo reconstruye.
 * No usa DataWedge Intent ni SDK nativo.
 */
@Injectable({ providedIn: 'root' })
export class ZebraHidScannerService implements CaptureSource {
  readonly mode = 'zebra' as const;

  private readonly capturesSubject = new Subject<CaptureEvent>();
  readonly captures$ = this.capturesSubject.asObservable();

  private scanner: ZebraKeyboardScanner | null = null;
  private readonly listeningState = signal(false);
  private readonly lastCodeState = signal<string | null>(null);

  readonly listening = this.listeningState.asReadonly();
  readonly lastCode = this.lastCodeState.asReadonly();

  start() {
    this.stop();
    const scanner = new ZebraKeyboardScanner({
      onCode: (code) => {
        this.lastCodeState.set(code);
        this.capturesSubject.next({ barcode: code, source: 'zebra' });
      }
    });
    this.scanner = scanner;
    scanner.start();
    this.listeningState.set(true);
  }

  stop() {
    this.scanner?.stop();
    this.scanner = null;
    this.listeningState.set(false);
  }
}
