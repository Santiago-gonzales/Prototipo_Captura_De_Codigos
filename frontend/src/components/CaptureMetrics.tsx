import type { CaptureSessionMetrics } from "../types/capture-session";

interface CaptureMetricsProps {
  metrics: CaptureSessionMetrics;
  now: number;
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CaptureMetrics({ metrics, now }: CaptureMetricsProps) {
  const durationMs = metrics.isActive && metrics.startedAt
    ? now - metrics.startedAt.getTime()
    : metrics.durationMs;

  return (
    <section className="capture-metrics" aria-live="polite">
      <div className="section-label"><span>04</span> / MÉTRICAS DE CAPTURA</div>
      <div className="capture-metrics-grid">
        <div><span>Duración</span><strong>{formatDuration(Math.max(0, durationMs))}</strong></div>
        <div><span>Códigos únicos</span><strong>{metrics.uniqueCodes}</strong></div>
        <div><span>Total unidades</span><strong>{metrics.totalUnits}</strong></div>
        <div><span>Eventos de captura</span><strong>{metrics.captureEvents}</strong></div>
      </div>
    </section>
  );
}
