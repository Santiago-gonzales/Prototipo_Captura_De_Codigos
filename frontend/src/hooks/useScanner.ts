import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { ScanItem } from "../types/scan";
import type { BarcodeDetection } from "../services/scanner-provider";
import type { ScannerProvider } from "../services/scanner-provider";
import { ZXingScannerProvider } from "../services/zxing-scanner-provider";
import { BarcodeTracker } from "../services/barcode-tracker";

interface UseScannerResult {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  running: boolean;
  scanning: boolean;
  status: string;
  accumulatedItems: ScanItem[];
  snapshotItems: ScanItem[];
  snapshotTotal: number;
  hasSnapshot: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  analyzeCode: () => Promise<string | null>;
  clearAccumulated: () => void;
}

export interface ScannerOptions {
  onBarcodeDetected?: (barcode: string, frameId?: number) => void | Promise<void>;
  provider?: ScannerProvider;
}

interface DecodedFrame {
  results: BarcodeDetection[];
  frameId: number;
}

export function useScanner(options: ScannerOptions = {}): UseScannerResult {
  const providerRef = useRef<ScannerProvider>(options.provider ?? new ZXingScannerProvider());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const automaticCodesRef = useRef(new Set<string>());
  const barcodeTrackerRef = useRef(new BarcodeTracker());
  const scanningRef = useRef(false);
  const lastScanRef = useRef(0);
  const frameIdRef = useRef(0);
  const runningRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const onBarcodeDetectedRef = useRef(options.onBarcodeDetected);
  onBarcodeDetectedRef.current = options.onBarcodeDetected;
  const [running, setRunning] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("Pulsa “Iniciar cámara”.");
  const [accumulatedItems, setAccumulatedItems] = useState<ScanItem[]>([]);
  const [snapshotItems, setSnapshotItems] = useState<ScanItem[]>([]);
  const [snapshotTotal, setSnapshotTotal] = useState(0);
  const [hasSnapshot, setHasSnapshot] = useState(false);

  const decodeCurrentFrame = useCallback(async (): Promise<DecodedFrame> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return { results: [], frameId: ++frameIdRef.current };
    }

    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("No se pudo preparar el canvas.");
    }

    context.drawImage(video, 0, 0, width, height);
    const frameId = ++frameIdRef.current;
    const results = await providerRef.current.decodeFrame(context, width, height, frameId);
    return { results, frameId };
  }, []);

  const processAutomaticResults = useCallback((frame: Awaited<ReturnType<typeof decodeCurrentFrame>>) => {
    const { results, frameId } = frame;
    const trackerInput = results.map((detection) => {
      if (!detection.bounds) {
        return `${detection.barcode} @ bounds:none`;
      }
      const { x, y, width, height } = detection.bounds;
      return `${detection.barcode} @ center=(${(x + width / 2).toFixed(1)}, ${(y + height / 2).toFixed(1)}), size=${width.toFixed(1)}x${height.toFixed(1)}`;
    });
    console.groupCollapsed(`[TRACKER INPUT] frame ${frameId}`);
    console.log(`detections: ${results.length}`);
    for (const detection of trackerInput) console.log(`- ${detection}`);
    console.groupEnd();

    const newValues = barcodeTrackerRef.current.update(results, performance.now());
    console.groupCollapsed(`[TRACKER OUTPUT] frame ${frameId}`);
    console.log("newValues:", newValues);
    console.log("activeEntities:", barcodeTrackerRef.current.getActiveEntityCount());
    console.groupEnd();
    let changed = false;

    for (const value of newValues) {
      if (!automaticCodesRef.current.has(value)) {
        automaticCodesRef.current.add(value);
        changed = true;
      }
    }

    if (changed) {
      setAccumulatedItems([...automaticCodesRef.current].sort().map((barcode) => ({ barcode, quantity: 1 })));
    }

    return { frameCount: results.length, newValues, frameId };
  }, []);

  const scanLoop = useCallback(async (timestamp: number) => {
    if (!runningRef.current) {
      return;
    }

    if (!scanningRef.current && timestamp - lastScanRef.current >= 500) {
      lastScanRef.current = timestamp;
      scanningRef.current = true;
      setScanning(true);

      try {
        const results = await decodeCurrentFrame();
        const frameSummary = processAutomaticResults(results);
        setStatus(frameSummary.frameCount > 0 ? `${frameSummary.frameCount} código(s) en el frame.` : "Buscando código...");
        for (const barcode of frameSummary.newValues) {
          void onBarcodeDetectedRef.current?.(barcode, frameSummary.frameId);
        }
        if (frameSummary.frameCount > 0) {
          console.log(`[CAMERA FRAME] frame ${frameSummary.frameId}, detections: ${frameSummary.frameCount}`);
        }
      } catch (error) {
        console.error("Error leyendo código:", error);
        setStatus("Error al analizar la imagen.");
      } finally {
        scanningRef.current = false;
        setScanning(false);
      }
    }

    if (runningRef.current && animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame((nextTimestamp) => {
        animationFrameRef.current = null;
        void scanLoop(nextTimestamp);
      });
    }
  }, [decodeCurrentFrame, processAutomaticResults]);

  useEffect(() => {
    if (!running || animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      animationFrameRef.current = null;
      void scanLoop(timestamp);
    });

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [running, scanLoop]);

  const startCamera = useCallback(async () => {
    try {
      if (!window.isSecureContext) throw new Error("La cámara requiere HTTPS o localhost.");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Este navegador no permite acceder a la cámara.");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("No se pudo preparar el video.");
      video.srcObject = stream;
      await video.play();
      runningRef.current = true;
      setRunning(true);
      setStatus("Cámara activa. Apunta al código de barras.");
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "No fue posible iniciar la cámara.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
    setScanning(false);
    setStatus("Cámara detenida.");
  }, []);

  const analyzeCode = useCallback(async (): Promise<string | null> => {
    if (!running || scanning) return null;

    setStatus("Analizando código...");
    try {
      const { results, frameId } = await decodeCurrentFrame();
      console.log(`[CAMERA SNAPSHOT] frame ${frameId}, detections: ${results.length}`);
      if (results.length !== 1) {
        setStatus(results.length === 0
          ? "No se detectó un código."
          : "Asegúrate de mostrar un solo código.");
        return null;
      }
      setStatus("Código detectado. Consultando inventario...");
      return results[0].barcode;
    } catch (error) {
      console.error("Error analizando el código:", error);
      setStatus("Error al analizar el código.");
      return null;
    }
  }, [decodeCurrentFrame, running, scanning]);

  const clearAccumulated = useCallback(() => {
    automaticCodesRef.current.clear();
    barcodeTrackerRef.current.clear();
    setAccumulatedItems([]);
    setStatus(running ? "Resultados limpiados. Continúa la prueba." : "Resultados limpiados.");
  }, [running]);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    running,
    scanning,
    status,
    accumulatedItems,
    snapshotItems,
    snapshotTotal,
    hasSnapshot,
    startCamera,
    stopCamera,
    analyzeCode,
    clearAccumulated
  };
}
