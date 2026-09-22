# RASI — Toma física (frontend Angular)

Migración del frontend React (`../frontend`) a Angular 22, orientada a móvil.
Consume el backend existente (`../backend`); solo se añadió `GET /api/warehouses` (catálogo de bodegas RASI).

## Ejecutar

```bash
npm install           # .npmrc usa legacy-peer-deps (bug de npm 10 con peers de Angular 22)
npm start             # https://localhost:4200 y https://<IP-LAN>:4200
npm run build         # dist/frontend-angular/browser
npm test              # Vitest (tracker, sesión, Zebra, exportación)
```

- `ng serve` usa HTTPS con los certificados de `../frontend/certs/` (la cámara
  exige contexto seguro) y reenvía `/api` a `http://127.0.0.1:3000` (`proxy.conf.json`).
- El backend debe estar corriendo (`cd ../backend && npm run dev`).

## Arquitectura

```
src/app/
  core/
    api/          ProductApiService, InventoryApiService (mismos endpoints que React),
                  WarehouseApiService
    warehouse/    WarehouseService (bodega activa + última usada) y guard de rutas
    scanning/     CameraScannerService (port de useScanner), ZebraHidScannerService,
                  BarcodeTracker, ZXingScannerProvider, ZebraKeyboardScanner,
                  ZebraAndroidScanner (copiados sin cambios de lógica), CaptureSource
    session/      CaptureSessionService (port del estado de App.tsx)
    lookup/       ProductLookupService (cache + secuencia), InventoryLookupService
    export/       ExportService + capture-workbook (port literal del Excel)
    diagnostics/  bus de eventos (sin cambios) + DiagnosticService (buffer)
  features/       start y warehouse (inicio / selección de bodega); capture, registry,
                  product, more (rutas con carga diferida, dentro de MainShell)
  shared/         badges, editor de cantidad, estados vacíos, formato
  models/         tipos de dominio
```

- **Fuentes de captura**: `CaptureSource { mode, captures$, start, stop }`.
  Cámara (ZXing + tracker) y Zebra HID la implementan. DataWedge / AI Data
  Capture deberán emitir por `captures$`; la sesión no cambia.
- **Cámara fuera de la vista Captura**: el `<video>` pertenece al servicio. La
  vista lo toma prestado; al navegar vuelve a un contenedor estacionado y la
  captura continúa (en React las vistas se ocultaban sin desmontarse).
- **Visor**: `object-fit: contain`, para que se vea el frame completo que analiza
  ZXing. El overlay dibuja las detecciones del último frame (solo visual).
- **WASM local**: `angular.json` copia `zxing_reader.wasm` a `zxing/` y
  `useLocalZXingWasm()` redirige la carga ahí. No depende de jsDelivr.

## Diferencias intencionales frente a React

| Tema | React | Angular |
|---|---|---|
| "Analizar código" durante un frame en curso | se ignoraba el toque, y podía decodificar en paralelo al bucle | espera al frame en curso y toma el mismo bloqueo |
| Validación de inventario | solo con "Analizar código" | además, automática y asíncrona por cada código capturado (cámara y Zebra) |
| Limpiar sesión | sin confirmación | pide confirmación si hay registros; también limpia las validaciones de inventario |
| Cantidad | solo edición directa | edición directa + botones −/+ (mínimo 0) |
| Visor | `cover` (recortaba el frame analizado) | `contain` |

## Pendiente de definición (negocio)

1. **Encabezado de la toma** (fecha, observación, bodega): el modelo existe
   (`PhysicalCountHeader`). La bodega es la bodega activa (`WarehouseService`,
   catálogo real en `GET /api/warehouses`, última bodega en `localStorage`).
   Falta el flujo "crear toma".
2. **Conteo por lote**: la cantidad física es por código de barras. Cómo repartirla
   entre lotes y vencimientos no está definido; los lotes solo se muestran.
3. **Guardado de la toma**: `PhysicalCountReport` queda preparado; no hay endpoint.
4. **Excel**: se conserva el formato actual (solo la fecha de generación, sin
   columnas de lote o vencimiento ni hora por ítem).
5. **"Detener captura"** no finaliza la sesión (la duración sigue), igual que en React.

## Pendiente técnico (Capacitor / Android)

- `XLSX.writeFile` no descarga dentro del WebView: requerirá Filesystem/Share.
- Configurar la URL del backend (`API_BASE_URL`), CORS (`CORS_ORIGIN`) y contenido
  mixto (app `https://localhost` → API `http://IP:3000`).
- Permiso `CAMERA` en el manifest; validar Zebra HID (foco del WebView y sufijo Enter).
- Tipografías de marca (manual RASI): HK Grotesk (principal) y Poppins
  (secundaria, textos largos). HK Grotesk no está en el proyecto ni en Google
  Fonts; se declara primero (se usa si el dispositivo la tiene instalada) y se
  carga Hanken Grotesk, su continuación libre (OFL), desde Google Fonts junto
  con Poppins. Sin conexión se usan las fuentes del sistema. Para no depender
  de la red habría que empaquetar los `.woff2` oficiales en `public/`.
- `xlsx@0.18.5` (misma versión que React) tiene avisos de `npm audit`; se usa
  solo para escribir archivos.
