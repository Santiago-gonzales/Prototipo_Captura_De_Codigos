import type { WorkBook } from 'xlsx';
import type { Product } from '../../models/product.model';
import type { ScanItem } from '../../models/scan-item.model';

type XlsxModule = typeof import('xlsx');

/** Nombre actual: captura_codigos_YYYY-MM-DD_HH-mm.xlsx */
export function captureFileName(generatedAt: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const filename = [
    generatedAt.getFullYear(),
    pad(generatedAt.getMonth() + 1),
    pad(generatedAt.getDate())
  ].join('-') + `_${pad(generatedAt.getHours())}-${pad(generatedAt.getMinutes())}`;
  return `captura_codigos_${filename}.xlsx`;
}

/** Port literal de `exportLastSnapshot` (App.tsx): mismas filas, formatos y columnas. */
export function buildCaptureWorkbook(
  XLSX: XlsxModule,
  items: ScanItem[],
  findCachedProduct: (barcode: string) => Product | null | undefined,
  generatedAt: Date
): WorkBook {
  const totalUnits = items.reduce((total, item) => total + item.quantity, 0);
  const rows: unknown[][] = [
    ['CAPTURA DE CÓDIGOS'],
    ['Fecha y hora de generación:', generatedAt],
    ['Códigos diferentes:', items.length],
    ['Total de unidades:', totalUnits],
    [],
    ['Código de barras', 'Producto', 'Descripción', 'Estado', 'Cantidad']
  ];

  for (const item of items) {
    const product = item.product ?? findCachedProduct(item.barcode);
    rows.push([
      String(item.barcode),
      product?.name || 'Producto no encontrado',
      product?.description || '-',
      product ? (product.status ? 'Activo' : 'Inactivo') : 'No encontrado',
      item.quantity
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const titleCell = worksheet['A1'];
  const generatedAtCell = worksheet['B2'];
  if (titleCell) {
    titleCell.s = { font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1061FF' } } };
  }
  if (generatedAtCell) {
    generatedAtCell.z = 'dd/mm/yyyy hh:mm';
  }

  for (const cellAddress of ['A6', 'B6', 'C6', 'D6', 'E6']) {
    const cell = worksheet[cellAddress];
    if (cell) {
      cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '3B3939' } } };
    }
  }

  for (let rowIndex = 7; rowIndex < rows.length + 1; rowIndex++) {
    const barcodeCell = worksheet[`A${rowIndex}`];
    if (barcodeCell) {
      barcodeCell.t = 's';
      barcodeCell.v = String(barcodeCell.v);
    }
  }

  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 48 },
    { wch: 18 },
    { wch: 12 }
  ];
  worksheet['!rows'] = [
    { hpt: 26 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 10 },
    { hpt: 22 }
  ];
  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  worksheet['!autofilter'] = { ref: `A6:E${rows.length}` };
  (worksheet as Record<string, unknown>)['!freeze'] = { xSplit: 0, ySplit: 6 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Captura');
  return workbook;
}
