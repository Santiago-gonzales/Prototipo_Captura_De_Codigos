import type { BarcodeBounds, BarcodeDetection } from "./scanner-provider";
import { emitDiagnosticEvent } from "./diagnostic-events";

export interface TrackedBarcode {
  id: number;
  barcode: string;
  bounds?: BarcodeBounds;
  lastSeenAt: number;
  expiredAt?: number;
}

const minimumDistance = 32;
const rearmDelayMs = 1500;

function center(bounds: BarcodeBounds) {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function matchDistance(first: BarcodeBounds, second: BarcodeBounds) {
  const firstCenter = center(first);
  const secondCenter = center(second);
  const distance = Math.hypot(firstCenter.x - secondCenter.x, firstCenter.y - secondCenter.y);
  const size = Math.max(first.width, first.height, second.width, second.height);
  const sizeRatio = Math.max(first.width, second.width) / Math.max(1, Math.min(first.width, second.width));
  const distanceLimit = Math.max(minimumDistance, size * 0.75);

  return distance <= distanceLimit ? distance : Number.POSITIVE_INFINITY;
}

function formatBounds(bounds?: BarcodeBounds) {
  if (!bounds) return null;
  return {
    x: Number(bounds.x.toFixed(1)),
    y: Number(bounds.y.toFixed(1)),
    width: Number(bounds.width.toFixed(1)),
    height: Number(bounds.height.toFixed(1))
  };
}

function getMatchDiagnostics(previousBounds?: BarcodeBounds, currentBounds?: BarcodeBounds) {
  if (!previousBounds && !currentBounds) {
    return {
      reason: null,
      distance: 0,
      maxDistance: null,
      sizeRatio: null
    };
  }

  if (!previousBounds || !currentBounds) {
    return {
      reason: "MISSING_BOUNDS" as const,
      distance: Number.POSITIVE_INFINITY,
      maxDistance: null,
      sizeRatio: null
    };
  }

  const firstCenter = center(previousBounds);
  const secondCenter = center(currentBounds);
  const distance = Math.hypot(firstCenter.x - secondCenter.x, firstCenter.y - secondCenter.y);
  const size = Math.max(previousBounds.width, previousBounds.height, currentBounds.width, currentBounds.height);
  const sizeRatio = Math.max(previousBounds.width, currentBounds.width) /
    Math.max(1, Math.min(previousBounds.width, currentBounds.width));
  const maxDistance = Math.max(minimumDistance, size * 0.75);

  return {
    reason: sizeRatio > 2.5
      ? "SIZE_RATIO" as const
      : distance > maxDistance
        ? "DISTANCE" as const
        : null,
    distance,
    maxDistance,
    sizeRatio
  };
}

interface PendingBarcode {
  barcode: string;
  bounds?: BarcodeBounds;
  observations: number;
  lastSeenAt: number;
  rejectedTrackedIds: Set<number>;
}

export class BarcodeTracker {
  private nextId = 1;
  private nextPendingId = 1;
  private tracked = new Map<number, TrackedBarcode>();
  private dormant = new Map<number, TrackedBarcode>();
  private pending = new Map<number, PendingBarcode>();

  update(detections: BarcodeDetection[], now: number): string[] {
    const matchedIds = new Set<number>();
    const newBarcodes: string[] = [];

    for (const [id, tracked] of this.dormant) {
      if (tracked.expiredAt !== undefined && now - tracked.expiredAt >= rearmDelayMs) {
        this.dormant.delete(id);
      }
    }

    for (const [id, candidate] of this.pending) {
      if (now - candidate.lastSeenAt >= rearmDelayMs) {
        this.pending.delete(id);
      }
    }

    for (const detection of detections) {
      const sameBarcodeEntities = [...this.tracked.values()]
        .filter((tracked) => tracked.barcode === detection.barcode && !matchedIds.has(tracked.id));

      for (const tracked of sameBarcodeEntities) {
        const diagnostics = getMatchDiagnostics(tracked.bounds, detection.bounds);
        if (diagnostics.reason) {
          const details = {
            barcode: detection.barcode,
            trackedId: tracked.id,
            reason: diagnostics.reason,
            distance: diagnostics.distance,
            maxDistance: diagnostics.maxDistance,
            sizeRatio: diagnostics.sizeRatio,
            maxSizeRatio: 2.5,
            previousBounds: formatBounds(tracked.bounds),
            currentBounds: formatBounds(detection.bounds)
          };
          console.log("[TRACKER MATCH REJECT]", details);
          emitDiagnosticEvent("TRACKER MATCH REJECT", details);
        }
      }

      const match = [...this.tracked.values()]
        .filter((tracked) => tracked.barcode === detection.barcode && !matchedIds.has(tracked.id))
        .map((tracked) => ({ tracked, distance: this.getDistance(tracked, detection) }))
        .filter((candidate) => Number.isFinite(candidate.distance))
        .sort((first, second) => first.distance - second.distance)[0];

      if (match) {
        const diagnostics = getMatchDiagnostics(match.tracked.bounds, detection.bounds);
        const details = {
          barcode: detection.barcode,
          trackedId: match.tracked.id,
          distance: diagnostics.distance,
          maxDistance: diagnostics.maxDistance,
          sizeRatio: diagnostics.sizeRatio,
          previousBounds: formatBounds(match.tracked.bounds),
          currentBounds: formatBounds(detection.bounds)
        };
        console.log("[TRACKER MATCH]", details);
        emitDiagnosticEvent("TRACKER MATCH", details);
        match.tracked.bounds = detection.bounds;
        match.tracked.lastSeenAt = now;
        matchedIds.add(match.tracked.id);
        for (const [pendingId, candidate] of this.pending) {
          if (candidate.rejectedTrackedIds.has(match.tracked.id)) {
            this.pending.delete(pendingId);
          }
        }
        continue;
      }

      const rejectedTrackedIds = new Set(sameBarcodeEntities.map((tracked) => tracked.id));
      const pendingMatch = [...this.pending.entries()]
        .filter(([, candidate]) => candidate.barcode === detection.barcode)
        .map(([id, candidate]) => ({ id, candidate, distance: this.getDistance(candidate, detection) }))
        .filter((candidate) => Number.isFinite(candidate.distance))
        .sort((first, second) => first.distance - second.distance)[0];

      if (pendingMatch) {
        pendingMatch.candidate.bounds = detection.bounds;
        pendingMatch.candidate.lastSeenAt = now;
        pendingMatch.candidate.observations += 1;
        for (const trackedId of rejectedTrackedIds) {
          pendingMatch.candidate.rejectedTrackedIds.add(trackedId);
        }

        if (pendingMatch.candidate.observations < 2) {
          continue;
        }

        this.pending.delete(pendingMatch.id);
      } else {
        this.pending.set(this.nextPendingId++, {
          barcode: detection.barcode,
          bounds: detection.bounds,
          observations: 1,
          lastSeenAt: now,
          rejectedTrackedIds
        });
        continue;
      }

      const tracked: TrackedBarcode = {
        id: this.nextId++,
        barcode: detection.barcode,
        bounds: detection.bounds,
        lastSeenAt: now
      };
      const details = {
        barcode: detection.barcode,
        trackedId: tracked.id,
        bounds: formatBounds(detection.bounds),
        activeEntitiesBefore: this.tracked.size,
        activeEntitiesAfter: this.tracked.size + 1
      };
      console.log("[TRACKER NEW ENTITY]", details);
      emitDiagnosticEvent("TRACKER NEW ENTITY", details);
      this.tracked.set(tracked.id, tracked);
      matchedIds.add(tracked.id);
      newBarcodes.push(tracked.barcode);
    }

    for (const [id, tracked] of this.tracked) {
      if (!matchedIds.has(id) && now - tracked.lastSeenAt >= rearmDelayMs) {
        const details = {
          trackedId: tracked.id,
          barcode: tracked.barcode,
          elapsed: now - tracked.lastSeenAt,
          rearmDelayMs,
          lastSeenAt: tracked.lastSeenAt,
          currentTime: now
        };
        console.log("[TRACKER EXPIRED]", details);
        emitDiagnosticEvent("TRACKER EXPIRED", details);
        this.tracked.delete(id);
        this.dormant.set(id, { ...tracked, expiredAt: now });
      }
    }

    return newBarcodes;
  }

  clear() {
    this.tracked.clear();
    this.dormant.clear();
    this.pending.clear();
    this.nextId = 1;
    this.nextPendingId = 1;
  }

  getActiveEntityCount() {
    return this.tracked.size;
  }

  private getDistance(tracked: Pick<TrackedBarcode, "bounds">, detection: BarcodeDetection) {
    if (!tracked.bounds && !detection.bounds) {
      return 0;
    }
    if (!tracked.bounds || !detection.bounds) {
      return Number.POSITIVE_INFINITY;
    }
    return matchDistance(tracked.bounds, detection.bounds);
  }
}