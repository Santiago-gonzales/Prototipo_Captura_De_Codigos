import { useEffect, useState } from "react";
import {
  subscribeDiagnosticEvents,
  type DiagnosticEvent
} from "../services/diagnostic-events";

const maximumEvents = 30;

function value(details: Record<string, unknown>, key: string) {
  const current = details[key];
  return current === undefined || current === null ? null : String(current);
}

function formatItems(details: Record<string, unknown>) {
  const items = details.items;
  if (!Array.isArray(items)) return null;
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return String(item);
      const entry = item as { barcode?: unknown; quantity?: unknown };
      return `${String(entry.barcode)} x ${String(entry.quantity)}`;
    })
    .join(", ");
}

function formatEventDetails(event: DiagnosticEvent) {
  const details = event.details;
  const formattedItems = formatItems(details);
  const parts = [
    value(details, "count") && `count ${value(details, "count")}`,
    value(details, "uniqueCodes") && `unique ${value(details, "uniqueCodes")}`,
    value(details, "totalUnits") && `total ${value(details, "totalUnits")}`,
    value(details, "callbackId") && `callback ${value(details, "callbackId")}`,
    value(details, "barcode"),
    value(details, "barcodes") && `codes ${value(details, "barcodes")}`,
    formattedItems && `items ${formattedItems}`,
    value(details, "trackedId") && `id ${value(details, "trackedId")}`,
    value(details, "reason"),
    value(details, "distance") && `dist ${value(details, "distance")}`,
    value(details, "maxDistance") && `max ${value(details, "maxDistance")}`,
    value(details, "sizeRatio") && `ratio ${value(details, "sizeRatio")}`,
    value(details, "elapsed") && `elapsed ${value(details, "elapsed")} ms`,
    value(details, "rearmDelayMs") && `rearm ${value(details, "rearmDelayMs")} ms`,
    value(details, "previousQuantity") && `prev ${value(details, "previousQuantity")}`,
    value(details, "newQuantity") && `new ${value(details, "newQuantity")}`
  ].filter(Boolean);

  return parts.join(" | ");
}

export function DiagnosticPanel() {
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeDiagnosticEvents((event) => {
      setEvents((currentEvents) => [event, ...currentEvents].slice(0, maximumEvents));
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <section className="diagnostic-panel" aria-live="polite">
      <div className="section-label"><span>05</span> / DIAGNÓSTICO</div>
      {events.length === 0 ? (
        <p className="diagnostic-empty">Esperando eventos del tracker y captura...</p>
      ) : (
        <div className="diagnostic-events">
          {events.map((event) => (
            <article className={`diagnostic-event diagnostic-${event.type.toLowerCase().replaceAll(" ", "-")}`} key={event.id}>
              <div className="diagnostic-event-header">
                <strong>{event.type}</strong>
                <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
              </div>
              <div className="diagnostic-event-details">{formatEventDetails(event)}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}