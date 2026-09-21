interface CaptureStatsProps {
  totalFound: number;
  differentCount: number;
}

export function CaptureStats({ totalFound, differentCount }: CaptureStatsProps) {
  return (
    <div className="snapshot-summary">
      <span id="snapshotCount">Códigos encontrados: {totalFound}</span>
      <span id="snapshotDifferentCount">Códigos diferentes: {differentCount}</span>
    </div>
  );
}
