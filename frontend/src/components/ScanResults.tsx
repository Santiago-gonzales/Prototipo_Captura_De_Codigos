import type { ScanItem } from "../types/scan";
import { CaptureStats } from "./CaptureStats";
import { ResultsTable } from "./ResultsTable";

interface ScanResultsProps {
  items: ScanItem[];
  totalFound: number;
  differentCount: number;
}

export function ScanResults({ items, totalFound, differentCount }: ScanResultsProps) {
  return (
    <section className="result-card">
      <div className="section-label"><span>02</span> / RESULTADO</div>
      <div className="snapshot-panel">
        <div className="snapshot-head">
          <div>
            <h2>Resultado de esta captura</h2>
            <CaptureStats totalFound={totalFound} differentCount={differentCount} />
          </div>
        </div>
        {items.length === 0 && (
          <div id="snapshotEmpty" className="empty">Pulsa “Analizar imagen” para analizar un solo frame.</div>
        )}
        <div className="snapshot-table-header" aria-hidden="true">
          <span>Código</span>
          <span>Cantidad</span>
        </div>
        <ResultsTable items={items} />
      </div>
    </section>
  );
}
