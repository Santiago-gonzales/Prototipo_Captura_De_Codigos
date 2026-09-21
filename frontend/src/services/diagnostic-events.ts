export type DiagnosticEventType =
  | "ZXING DETECTIONS"
  | "ON BARCODE DETECTED"
  | "TRACKER MATCH"
  | "TRACKER MATCH REJECT"
  | "TRACKER EXPIRED"
  | "TRACKER NEW ENTITY"
  | "APP CAPTURE"
  | "CAPTURED ITEMS COMMITTED";

export interface DiagnosticEvent {
  id: number;
  timestamp: string;
  type: DiagnosticEventType;
  details: Record<string, unknown>;
}

type DiagnosticListener = (event: DiagnosticEvent) => void;

let nextEventId = 1;
const listeners = new Set<DiagnosticListener>();

export function emitDiagnosticEvent(type: DiagnosticEventType, details: Record<string, unknown>) {
  const event: DiagnosticEvent = {
    id: nextEventId++,
    timestamp: new Date().toISOString(),
    type,
    details
  };

  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeDiagnosticEvents(listener: DiagnosticListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}