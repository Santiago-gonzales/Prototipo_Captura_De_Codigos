import type { CaptureMode } from "../components/CaptureModeSelector";

export interface CaptureSessionMetrics {
  startedAt: Date | null;
  endedAt: Date | null;
  durationMs: number;
  mode: CaptureMode;
  uniqueCodes: number;
  totalUnits: number;
  captureEvents: number;
  isActive: boolean;
}
