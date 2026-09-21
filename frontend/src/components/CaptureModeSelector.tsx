export type CaptureMode = "camera" | "zebra";

interface CaptureModeSelectorProps {
  value: CaptureMode;
  onChange: (mode: CaptureMode) => void;
}

export function CaptureModeSelector({ value, onChange }: CaptureModeSelectorProps) {
  return (
    <section className="capture-mode-card" aria-labelledby="capture-mode-title">
      <div className="section-label"><span>01</span> / MÉTODO DE CAPTURA</div>
      <div className="capture-mode-heading">
        <h2 id="capture-mode-title">Método de captura</h2>
        <span>Selecciona la fuente de lectura activa.</span>
      </div>
      <div className="capture-mode-options" role="group" aria-label="Método de captura">
        <button
          type="button"
          className={value === "camera" ? "capture-mode-option active" : "capture-mode-option"}
          aria-pressed={value === "camera"}
          onClick={() => onChange("camera")}
        >
          <span>Cámara</span>
        </button>
        <button
          type="button"
          className={value === "zebra" ? "capture-mode-option active zebra" : "capture-mode-option zebra"}
          aria-pressed={value === "zebra"}
          onClick={() => onChange("zebra")}
        >
          <span>Dispositivo ZEBRA</span>
        </button>
      </div>
    </section>
  );
}
