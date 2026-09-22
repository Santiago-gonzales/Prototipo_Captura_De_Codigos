import * as XLSX from 'xlsx';
import { buildCaptureWorkbook, captureFileName } from './capture-workbook';

describe('Exportación Excel', () => {
  it('conserva el nombre de archivo actual', () => {
    expect(captureFileName(new Date(2026, 8, 22, 7, 5))).toBe('captura_codigos_2026-09-22_07-05.xlsx');
  });

  it('conserva encabezado, columnas y valores de la exportación React', () => {
    const generatedAt = new Date(2026, 8, 22, 7, 5);
    const workbook = buildCaptureWorkbook(XLSX, [
      { barcode: '0012345', quantity: 3, product: { id: 1, barcode: '0012345', name: 'Guantes', description: 'Caja x 100', status: true } },
      { barcode: '999', quantity: 1, product: null },
      { barcode: '555', quantity: 2 }
    ], (barcode) => (barcode === '555' ? { id: 2, barcode, name: 'Gasas', status: false } : undefined), generatedAt);

    const sheet = workbook.Sheets['Captura'];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
    expect(rows[0]).toEqual(['CAPTURA DE CÓDIGOS']);
    expect(rows[2]).toEqual(['Códigos diferentes:', 3]);
    expect(rows[3]).toEqual(['Total de unidades:', 6]);
    expect(rows[5]).toEqual(['Código de barras', 'Producto', 'Descripción', 'Estado', 'Cantidad']);
    expect(rows[6]).toEqual(['0012345', 'Guantes', 'Caja x 100', 'Activo', 3]);
    expect(rows[7]).toEqual(['999', 'Producto no encontrado', '-', 'No encontrado', 1]);
    expect(rows[8]).toEqual(['555', 'Gasas', '-', 'Inactivo', 2]);
    expect(sheet['A7'].t).toBe('s');
    expect(sheet['!autofilter']).toEqual({ ref: 'A6:E9' });
  });
});
