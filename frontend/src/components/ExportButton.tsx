interface ExportButtonProps {
  onExport: () => void;
}

export function ExportButton({ onExport }: ExportButtonProps) {
  return <button id="exportBtn" onClick={onExport}>Exportar a Excel</button>;
}
