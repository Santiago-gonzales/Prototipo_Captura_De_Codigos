import type { RefObject } from "react";

interface CameraScannerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: string;
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  onAnalyzeCode: () => void | Promise<void>;
  analyzeDisabled: boolean;
}

export function CameraScanner({ videoRef, canvasRef, status, running, onStart, onStop, onAnalyzeCode, analyzeDisabled }: CameraScannerProps) {
  return (
    <section className="camera-card">
      <div className="section-label"><span>01</span> / CAPTURA</div>
      <div className="camera-heading">
        <h2>Camera / Scanner</h2>
        <span className="live-mark">● {running ? "CAPTURA ACTIVA" : "CAPTURA DETENIDA"}</span>
      </div>
      <div className="video-wrap">
        <video id="video" ref={videoRef} autoPlay playsInline muted />
        <canvas id="canvas" ref={canvasRef} hidden />
        <div id="status" className="status" aria-live="polite">{status}</div>
      </div>
      <div className="actions">
        <button id="startBtn" onClick={onStart} disabled={running}>Iniciar cámara</button>
        <button id="stopBtn" className="secondary" onClick={onStop} disabled={!running}>Detener</button>
        <button id="analyzeBtn" onClick={onAnalyzeCode} disabled={analyzeDisabled}>Analizar código</button>
      </div>
    </section>
  );
}
