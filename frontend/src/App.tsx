import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { CameraScanner } from "./components/CameraScanner";
import { CaptureModeSelector, type CaptureMode } from "./components/CaptureModeSelector";
import { CaptureMetrics } from "./components/CaptureMetrics";
import { ExportButton } from "./components/ExportButton";
import { ProductLookup } from "./components/ProductLookup";
import { ResultsTable } from "./components/ResultsTable";
import { ScanResults } from "./components/ScanResults";
import { InventoryLookup } from "./components/InventoryLookup";
import { useScanner } from "./hooks/useScanner";
import { getInventoryByBarcode, getProductByBarcode, type InventoryLookup as InventoryLookupData } from "./services/api";
import { ZebraKeyboardScanner } from "./services/zebra-keyboard-scanner";
import { emitDiagnosticEvent } from "./services/diagnostic-events";
import { DiagnosticPanel } from "./components/DiagnosticPanel";
import type { Product } from "./types/product";
import type { ScanItem } from "./types/scan";
import type { CaptureSessionMetrics } from "./types/capture-session";

type ProductLookupStatus = "idle" | "loading" | "found" | "not-found" | "error";
type AppView = "capture" | "register" | "product" | "more";

const initialSessionMetrics = (mode: CaptureMode): CaptureSessionMetrics => ({
  startedAt: null,
  endedAt: null,
  durationMs: 0,
  mode,
  uniqueCodes: 0,
  totalUnits: 0,
  captureEvents: 0,
  isActive: false
});

export function App() {
  const [view, setView] = useState<AppView>("capture");
  const [product, setProduct] = useState<Product | null>(null);
  const [productBarcode, setProductBarcode] = useState<string | null>(null);
  const [productStatus, setProductStatus] = useState<ProductLookupStatus>("idle");
  const [inventoryLookup, setInventoryLookup] = useState<InventoryLookupData | null>(null);
  const [inventoryBarcode, setInventoryBarcode] = useState<string | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<ProductLookupStatus>("idle");
  const [capturedItems, setCapturedItems] = useState<ScanItem[]>([]);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("camera");
  const [lastZebraCode, setLastZebraCode] = useState<string | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState<CaptureSessionMetrics>(() => initialSessionMetrics("camera"));
  const [metricsNow, setMetricsNow] = useState(() => Date.now());
  const pendingBarcodesRef = useRef(new Set<string>());
  const productCacheRef = useRef(new Map<string, Product | null>());
  const requestSequenceRef = useRef(0);
  const zebraScannerRef = useRef<ZebraKeyboardScanner | null>(null);
  const barcodeCallbackIdRef = useRef(0);
  const sessionMetricsRef = useRef(sessionMetrics);
  const capturedItemsRef = useRef(capturedItems);
  sessionMetricsRef.current = sessionMetrics;
  capturedItemsRef.current = capturedItems;

  useEffect(() => {
    const committedItems = capturedItems.map((item) => ({
      barcode: item.barcode,
      quantity: item.quantity
    }));
    const totalUnits = capturedItems.reduce((total, item) => total + item.quantity, 0);
    emitDiagnosticEvent("CAPTURED ITEMS COMMITTED", {
      uniqueCodes: capturedItems.length,
      totalUnits,
      items: committedItems
    });
    console.log("[CAPTURED ITEMS COMMITTED]", committedItems);
  }, [capturedItems]);

  const beginCaptureSession = useCallback((mode: CaptureMode) => {
    if (sessionMetricsRef.current.isActive && sessionMetricsRef.current.mode === mode) return;
    const startedAt = new Date();
    const nextMetrics = { ...initialSessionMetrics(mode), startedAt, isActive: true };
    sessionMetricsRef.current = nextMetrics;
    setSessionMetrics(nextMetrics);
    setMetricsNow(startedAt.getTime());
  }, []);

  const finishCaptureSession = useCallback(() => {
    if (!sessionMetricsRef.current.isActive || !sessionMetricsRef.current.startedAt) return;
    const endedAt = new Date();
    const items = capturedItemsRef.current;
    const nextMetrics: CaptureSessionMetrics = {
      ...sessionMetricsRef.current,
      endedAt,
      durationMs: endedAt.getTime() - sessionMetricsRef.current.startedAt.getTime(),
      uniqueCodes: items.length,
      totalUnits: items.reduce((total, item) => total + item.quantity, 0),
      isActive: false
    };
    sessionMetricsRef.current = nextMetrics;
    setSessionMetrics(nextMetrics);
    setMetricsNow(endedAt.getTime());
  }, []);

  const handleBarcodeDetected = useCallback(async (barcode: string, frameId?: number) => {
    const callbackId = ++barcodeCallbackIdRef.current;
    emitDiagnosticEvent("ON BARCODE DETECTED", {
      callbackId,
      barcode,
      frameId: frameId ?? "?"
    });
    console.log("[ON BARCODE DETECTED]", {
      callbackId,
      barcode,
      frameId: frameId ?? "?",
      timestamp: new Date().toISOString()
    });
    if (!sessionMetricsRef.current.isActive) {
      beginCaptureSession(captureMode);
    }
    setSessionMetrics((currentMetrics) => ({
      ...currentMetrics,
      captureEvents: currentMetrics.captureEvents + 1
    }));
    const cachedProduct = productCacheRef.current.get(barcode);
    const hasCachedProduct = productCacheRef.current.has(barcode);
    const previousItem = capturedItemsRef.current.find((item) => item.barcode === barcode);
    const previousQuantity = previousItem?.quantity ?? 0;
    const nextQuantity = previousQuantity + 1;
    const diagnosticDetails = {
      timestamp: new Date().toISOString(),
      frameId: frameId ?? "?",
      barcode,
      previousQuantity,
      newQuantity: nextQuantity,
      productAlreadyExisted: Boolean(previousItem)
    };
    console.log("[APP CAPTURE]", diagnosticDetails);
    emitDiagnosticEvent("APP CAPTURE", diagnosticDetails);
    setCapturedItems((previousItems) => {
      const previousItem = previousItems.find((item) => item.barcode === barcode);
      const previousQuantity = previousItem?.quantity ?? 0;
      const nextQuantity = previousQuantity + 1;

      const nextItems = previousItem
        ? previousItems.map((item) => item.barcode === barcode
          ? { ...item, quantity: nextQuantity, product: hasCachedProduct ? cachedProduct : item.product }
          : item)
        : [...previousItems, { barcode, quantity: 1, product: cachedProduct }];
      console.groupCollapsed("[CAPTURE STATE]");
      console.log("uniqueCodes:", nextItems.length);
      console.log("totalUnits:", nextItems.reduce((total, item) => total + item.quantity, 0));
      for (const item of nextItems) console.log(`${item.barcode} -> ${item.quantity}`);
      console.groupEnd();
      return nextItems;
    });

    if (hasCachedProduct) {
      setProductBarcode(barcode);
      setProduct(cachedProduct || null);
      setProductStatus(cachedProduct ? "found" : "not-found");
      return;
    }

    if (pendingBarcodesRef.current.has(barcode)) {
      return;
    }

    pendingBarcodesRef.current.add(barcode);
    const requestSequence = ++requestSequenceRef.current;
    setProductBarcode(barcode);
    setProduct(null);
    setProductStatus("loading");

    try {
      const result = await getProductByBarcode(barcode);
      productCacheRef.current.set(barcode, result);
      setCapturedItems((currentItems) => currentItems.map((item) =>
        item.barcode === barcode ? { ...item, product: result } : item
      ));
      if (requestSequence === requestSequenceRef.current) {
        setProduct(result);
        setProductStatus(result ? "found" : "not-found");
      }
    } catch {
      if (requestSequence === requestSequenceRef.current) {
        setProductStatus("error");
      }
    } finally {
      pendingBarcodesRef.current.delete(barcode);
    }
  }, [beginCaptureSession, captureMode]);

  const scanner = useScanner({ onBarcodeDetected: handleBarcodeDetected });

  const analyzeCode = useCallback(async () => {
    setInventoryStatus("loading");
    setInventoryLookup(null);
    const barcode = await scanner.analyzeCode();
    if (!barcode) {
      setInventoryStatus("idle");
      return;
    }

    setInventoryBarcode(barcode);
    try {
      const result = await getInventoryByBarcode(barcode);
      setInventoryLookup(result);
      setInventoryStatus(result ? "found" : "not-found");
    } catch {
      setInventoryStatus("error");
    }
  }, [scanner.analyzeCode]);

  useEffect(() => {
    zebraScannerRef.current?.stop();
    zebraScannerRef.current = null;

    if (captureMode === "zebra") {
      scanner.stopCamera();
      beginCaptureSession("zebra");
      const zebraScanner = new ZebraKeyboardScanner({
        onCode: async (code) => {
          setLastZebraCode(code);
          await handleBarcodeDetected(code);
        }
      });
      zebraScannerRef.current = zebraScanner;
      zebraScanner.start();
    }

    return () => {
      zebraScannerRef.current?.stop();
      zebraScannerRef.current = null;
      if (captureMode === "zebra") finishCaptureSession();
    };
  }, [beginCaptureSession, captureMode, finishCaptureSession, handleBarcodeDetected, scanner.stopCamera]);

  useEffect(() => () => {
    zebraScannerRef.current?.stop();
    finishCaptureSession();
  }, [finishCaptureSession]);

  useEffect(() => {
    if (captureMode === "camera" && scanner.running) {
      beginCaptureSession("camera");
    }
  }, [beginCaptureSession, captureMode, scanner.running]);

  useEffect(() => {
    if (!sessionMetrics.isActive) return;
    const timer = window.setInterval(() => setMetricsNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sessionMetrics.isActive]);

  useEffect(() => {
    if (!sessionMetrics.isActive) return;
    const totalUnits = capturedItems.reduce((total, item) => total + item.quantity, 0);
    if (sessionMetrics.uniqueCodes === capturedItems.length && sessionMetrics.totalUnits === totalUnits) return;
    setSessionMetrics((currentMetrics) => ({
      ...currentMetrics,
      uniqueCodes: capturedItems.length,
      totalUnits
    }));
  }, [capturedItems, sessionMetrics.isActive, sessionMetrics.totalUnits, sessionMetrics.uniqueCodes]);

  const exportLastSnapshot = useCallback(() => {
    if (capturedItems.length === 0) {
      window.alert("Primero debes capturar un producto.");
      return;
    }

    const generatedAt = new Date();
    const totalUnits = capturedItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
    const rows: unknown[][] = [
      ["CAPTURA DE CÓDIGOS"],
      ["Fecha y hora de generación:", generatedAt],
      ["Códigos diferentes:", capturedItems.length],
      ["Total de unidades:", totalUnits],
      [],
      ["Código de barras", "Producto", "Descripción", "Estado", "Cantidad"]
    ];

    for (const item of capturedItems) {
      const product = item.product ?? productCacheRef.current.get(item.barcode);
      rows.push([
        String(item.barcode),
        product?.name || "Producto no encontrado",
        product?.description || "-",
        product ? (product.status ? "Activo" : "Inactivo") : "No encontrado",
        item.quantity
      ]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const titleCell = worksheet.A1;
    const generatedAtCell = worksheet.B2;
    if (titleCell) {
      titleCell.s = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1061FF" } } };
    }
    if (generatedAtCell) {
      generatedAtCell.z = "dd/mm/yyyy hh:mm";
    }

    for (const cellAddress of ["A6", "B6", "C6", "D6", "E6"]) {
      const cell = worksheet[cellAddress];
      if (cell) {
        cell.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3B3939" } } };
      }
    }

    for (let rowIndex = 7; rowIndex < rows.length + 1; rowIndex++) {
      const barcodeCell = worksheet[`A${rowIndex}`];
      if (barcodeCell) {
        barcodeCell.t = "s";
        barcodeCell.v = String(barcodeCell.v);
      }
    }

    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 28 },
      { wch: 48 },
      { wch: 18 },
      { wch: 12 }
    ];
    worksheet["!rows"] = [
      { hpt: 26 },
      { hpt: 20 },
      { hpt: 20 },
      { hpt: 20 },
      { hpt: 10 },
      { hpt: 22 }
    ];
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    worksheet["!autofilter"] = { ref: `A6:E${rows.length}` };
    worksheet["!freeze"] = { xSplit: 0, ySplit: 6 };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Captura");
    const pad = (value: number) => String(value).padStart(2, "0");
    const filename = [
      generatedAt.getFullYear(),
      pad(generatedAt.getMonth() + 1),
      pad(generatedAt.getDate())
    ].join("-") + `_${pad(generatedAt.getHours())}-${pad(generatedAt.getMinutes())}`;
    XLSX.writeFile(workbook, `captura_codigos_${filename}.xlsx`, { cellDates: true });
  }, [capturedItems]);

  const clearCapturedItems = useCallback(() => {
    finishCaptureSession();
    requestSequenceRef.current += 1;
    pendingBarcodesRef.current.clear();
    setCapturedItems([]);
    setProduct(null);
    setProductBarcode(null);
    setProductStatus("idle");
    scanner.clearAccumulated();
  }, [finishCaptureSession, scanner.clearAccumulated]);

  const handleQuantityChange = useCallback((barcode: string, newQuantity: number) => {
    setCapturedItems((currentItems) =>
      currentItems.map((item) =>
        item.barcode === barcode
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  }, []);

  const totalCapturedUnits = capturedItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const lastDetectedBarcode = productBarcode ?? lastZebraCode ?? capturedItems[capturedItems.length - 1]?.barcode ?? null;

  return (
    <main className="app">
      <header>
        <div className="header-meta"><strong>RASI</strong><span>PROTOTIPO DE CAPTURA DE INVENTARIO / V. 01</span></div>
        <h1>Captura de códigos</h1>
        <p>Detección múltiple / prueba técnica</p>
      </header>

      <section className={view === "capture" ? "view-section capture-view" : "view-section capture-view is-hidden"} aria-hidden={view !== "capture"}>
        <CaptureModeSelector value={captureMode} onChange={setCaptureMode} />

        {captureMode === "camera" ? (
          <CameraScanner
            videoRef={scanner.videoRef}
            canvasRef={scanner.canvasRef}
            status={scanner.status}
            running={scanner.running}
            onStart={scanner.startCamera}
            onStop={scanner.stopCamera}
            onAnalyzeCode={analyzeCode}
            analyzeDisabled={!scanner.running || scanner.scanning}
          />
        ) : (
          <section className="zebra-card" aria-live="polite">
            <div className="section-label"><span>02</span> / ENTRADA ZEBRA</div>
            <div className="zebra-status-heading">
              <div>
                <h2>Dispositivo ZEBRA</h2>
                <p>Esperando códigos escaneados...</p>
              </div>
            </div>
            <p className="zebra-instructions">Conecta el dispositivo ZEBRA al equipo y escanea un código de barras.</p>
            <div className="zebra-last-code">
              <span>Último código recibido</span>
              <strong>{lastZebraCode ?? "—"}</strong>
            </div>
          </section>
        )}

        <section className="last-reading" aria-live="polite">
          <div>
            <span className="last-reading-label">Última lectura</span>
            <strong>{lastDetectedBarcode ?? "—"}</strong>
          </div>
          <span className="last-reading-product">
            {product ? product.name : lastDetectedBarcode ? (productStatus === "not-found" ? "Producto no encontrado" : productStatus === "loading" ? "Consultando producto..." : "Producto no consultado") : "Sin lecturas"}
          </span>
        </section>

        <CaptureMetrics metrics={sessionMetrics} now={metricsNow} />
      </section>

      <section className={view === "register" ? "view-section register-view" : "view-section register-view is-hidden"} aria-hidden={view !== "register"}>
      <section className="register-card">
        <div className="section-label"><span>03</span> / REGISTRO</div>
        <div className="result-head">
          <div>
            <h2>Códigos únicos acumulados</h2>
            <span id="count">{capturedItems.length} código{capturedItems.length === 1 ? "" : "s"} únicos</span>
            <div className="session-stats" aria-live="polite">
              <span>Total unidades: {totalCapturedUnits}</span>
            </div>
          </div>
          <div className="register-actions">
            <ExportButton onExport={exportLastSnapshot} />
            <button id="clearBtn" className="secondary" onClick={clearCapturedItems}>Limpiar</button>
          </div>
        </div>
        {capturedItems.length === 0 && <div id="empty" className="empty">Apunta la cámara hacia varios códigos de barras.</div>}
        <div className="register-scroll">
          <div className="register-table-header" aria-hidden="true">
            <span>Código</span>
            <span>Producto</span>
            <span>Descripción</span>
            <span>Estado</span>
            <span>Cantidad</span>
          </div>
          <ResultsTable 
            items={capturedItems} 
            accumulated 
            onQuantityChange={handleQuantityChange}
          />
        </div>
      </section>
      </section>

      <section className={view === "product" ? "view-section product-view" : "view-section product-view is-hidden"} aria-hidden={view !== "product"}>
        <ProductLookup items={capturedItems} activeBarcode={productBarcode} status={productStatus} />
        <InventoryLookup barcode={inventoryBarcode} result={inventoryLookup} status={inventoryStatus} />
      </section>

      <section className={view === "more" ? "view-section more-view" : "view-section more-view is-hidden"} aria-hidden={view !== "more"}>
        <CaptureMetrics metrics={sessionMetrics} now={metricsNow} />
        <DiagnosticPanel />

      <section className="test-card">
        <div className="section-label"><span>04</span> / INFORMACIÓN</div>
        <strong>Objetivo de esta prueba</strong>
        <p>Comprobar si la cámara puede analizar una imagen con varios códigos y devolver sus valores.</p>
        <p className="note">Esta versión no conecta con RASI, no modifica inventarios y todavía no genera Excel.</p>
      </section>
      </section>

      <nav className="main-nav" aria-label="Navegación principal">
        <button type="button" className={view === "capture" ? "active" : ""} aria-current={view === "capture" ? "page" : undefined} onClick={() => setView("capture")}>Captura</button>
        <button type="button" className={view === "register" ? "active" : ""} aria-current={view === "register" ? "page" : undefined} onClick={() => setView("register")}>Registro</button>
        <button type="button" className={view === "product" ? "active" : ""} aria-current={view === "product" ? "page" : undefined} onClick={() => setView("product")}>Producto</button>
        <button type="button" className={view === "more" ? "active" : ""} aria-current={view === "more" ? "page" : undefined} onClick={() => setView("more")}>Más</button>
      </nav>
    </main>
  );
}
