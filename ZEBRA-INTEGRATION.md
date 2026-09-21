# Integración Zebra: estado y siguiente fase

## Estado implementado

- Cámara: `video -> canvas -> ImageData -> zxing-wasm -> BarcodeTracker`.
- Zebra HID: `keydown -> ZebraKeyboardScanner -> App`.
- Ninguno de esos flujos fue reemplazado.
- No se agregaron API keys, tokens ni credenciales.

## DataWedge Intent Output

DataWedge puede entregar el resultado a una aplicación Android mediante un
Android Intent. La aplicación debe declarar/registrar un componente Android
(Activity, Service o BroadcastReceiver) y configurar en DataWedge una acción,
categoría y método de entrega compatibles. Los datos se entregan en extras
como `com.symbol.datawedge.data_string`, `com.symbol.datawedge.label_type` y,
cuando corresponde, la colección `com.symbol.datawedge.barcodes`.

Esto no es un mecanismo que el navegador web pueda recibir directamente. La
web actual solo puede continuar con HID. Para utilizar Intent Output hay que
empaquetar la interfaz en una aplicación Android/híbrida y crear un bridge
nativo que traduzca el Intent al contrato de eventos del frontend.

`frontend/src/services/zebra-android-scanner.ts` contiene únicamente esa
frontera tipada y un normalizador de payload. No registra Intents ni simula un
dispositivo Zebra en el navegador.

## AI Data Capture / Barcode Decoder

La documentación oficial describe un SDK para aplicaciones Java/Kotlin en
dispositivos móviles Zebra. `BarcodeDecoder` puede localizar y decodificar uno
o varios códigos en una imagen, y ofrece integración con analizadores CameraX.
También existen opciones para reportar duplicados.

No se integró en este frontend porque requiere una aplicación Android, AAR/modelos
del SDK, cámara/frames gestionados en Android y hardware Zebra compatible. No
hay una API JavaScript equivalente para ejecutarlo desde Vite en un navegador.

## Arquitectura futura

```text
ZXingCameraScanner  -> ScannerProvider (frames)
ZebraHidScanner     -> ZebraKeyboardScanner (teclado)
ZebraAndroidScanner -> ScannerEventProvider (Intent/bridge Android)
                                      |
                                      v
                              useScanner / App
```

El contrato actual `ScannerProvider` sigue siendo correcto para la cámara. La
entrada Android se modela como eventos porque un Intent no es un frame de
imagen. La integración futura deberá conectar sus eventos al mismo callback de
captura y dejar que `App` conserve la deduplicación y las cantidades.

## Requisitos para la siguiente fase

1. Dispositivo Zebra compatible con DataWedge y un perfil asociado a la app.
2. Shell Android/híbrido con Activity o BroadcastReceiver.
3. Bridge nativo que entregue el payload al frontend.
4. Si se elige AI Data Capture, proyecto Android con el SDK/modelo y validación
   de compatibilidad del dispositivo.

Referencias oficiales:

- https://techdocs.zebra.com/datawedge/latest/guide/output/intent/
- https://techdocs.zebra.com/datawedge/latest/guide/api/tutorials/
- https://techdocs.zebra.com/ai-datacapture/latest/about/
- https://techdocs.zebra.com/ai-datacapture/4-0/barcodedecoder/
