import { Injectable, inject } from '@angular/core';
import { ProductLookupService } from '../lookup/product-lookup.service';
import { CaptureSessionService } from '../session/capture-session.service';
import { buildCaptureWorkbook, captureFileName } from './capture-workbook';

export type ExportResult = { ok: true; fileName: string } | { ok: false; message: string };

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly session = inject(CaptureSessionService);
  private readonly products = inject(ProductLookupService);

  /**
   * Genera y descarga el Excel de la captura. `xlsx` se carga bajo demanda.
   * PENDIENTE (Capacitor): en WebView Android `writeFile` no descarga; se
   * requerirá Filesystem/Share en la etapa de empaquetado.
   */
  async exportCapture(): Promise<ExportResult> {
    const items = this.session.items();
    if (items.length === 0) {
      return { ok: false, message: 'Primero debes capturar un producto.' };
    }

    const XLSX = await import('xlsx');
    const generatedAt = new Date();
    const workbook = buildCaptureWorkbook(XLSX, items, (barcode) => this.products.get(barcode), generatedAt);
    const fileName = captureFileName(generatedAt);
    XLSX.writeFile(workbook, fileName, { cellDates: true });
    return { ok: true, fileName };
  }
}
