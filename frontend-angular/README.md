# RASI — Toma física (frontend Angular)

Migración del frontend React (`../frontend`) a Angular 22, orientada a móvil.
Consume el backend existente (`../backend`) sin cambios.

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
    api/          ProductApiService, InventoryApiService (mismos endpoints que React)
    scanning/     CameraScannerService (port de useScanner), ZebraHidScannerService,
                  BarcodeTracker, ZXingScannerProvider, ZebraKeyboardScanner,
                  ZebraAndroidScanner (copiados sin cambios de lógica), CaptureSource
    session/      CaptureSessionService (port del estado de App.tsx)
    lookup/       ProductLookupService (cache + secuencia), InventoryLookupService
    export/       ExportService + capture-workbook (port literal del Excel)
    diagnostics/  bus de eventos (sin cambios) + DiagnosticService (buffer)
  features/       capture, registry, product, more (rutas con carga diferida)
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
   (`PhysicalCountHeader`); la bodega se fija en **2**, como en React. Falta el
   flujo "crear toma" y un catálogo de bodegas (no existe un endpoint).
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
- Las fuentes (Poppins, Space Grotesk) vienen de Google Fonts; sin conexión se
  usan las fuentes del sistema.
- `xlsx@0.18.5` (misma versión que React) tiene avisos de `npm audit`; se usa
  solo para escribir archivos.
