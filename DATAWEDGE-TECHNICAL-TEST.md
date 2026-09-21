# Prueba tecnica aislada de DataWedge

Este documento define una prueba experimental independiente de RASI. No modifica el frontend, backend, API, base de datos ni la arquitectura de providers.

## Estado actual

La prueba no se ha ejecutado porque este entorno no tiene un dispositivo Zebra conectado. `adb` tampoco esta instalado. El dispositivo USB detectado es un Motorola XT1541, no un Zebra.

No se simulan resultados ni se inventan payloads.

## Objetivo

Determinar como DataWedge entrega los resultados para estas capturas:

| Prueba | Codigos fisicos esperados |
| --- | --- |
| A | A |
| A + B | A, B |
| A + A | A, A |
| A + A + B | A, A, B |

La pregunta principal es si `A + A` conserva dos ocurrencias o si DataWedge entrega solamente una.

## Identificacion del dispositivo

Registrar antes de configurar:

- modelo exacto del Zebra;
- version de Android;
- version de DataWedge;
- scanner seleccionado: `INTERNAL_IMAGER`, `INTERNAL_CAMERA` u otro;
- version del scanner framework, si aparece en la pantalla About o en el Integrator Guide;
- licencia Mobility DNA, si el dispositivo Professional la requiere.

DataWedge documenta que la disponibilidad de funciones depende del modelo, Android, scanner framework y version de DataWedge. Consultar la [Feature Matrix oficial](https://techdocs.zebra.com/datawedge/latest/guide/matrix/) para el modelo concreto.

## Configuracion base

Crear un perfil exclusivo para esta prueba:

```text
Profile name: RASI-DW-TECHNICAL-TEST
Associated app: aplicacion Android de prueba
Activity: * o la Activity receptora
```

Configurar:

```text
Barcode Input: Enabled
Scanner selection: el scanner integrado disponible
Keystroke Output: Disabled
Intent Output: Enabled
Intent action: com.rasi.datawedge.TECHNICAL_TEST
Intent category: android.intent.category.DEFAULT
Intent delivery: Broadcast Intent
```

La aplicacion Android de prueba debe registrar un `BroadcastReceiver` para esa accion y volcar cada Intent recibido a un log visible o a un archivo JSON local.

No usar `data_string` concatenado como unica fuente en MultiBarcode. Cuando el modo sea multiple, registrar tambien el extra `com.symbol.datawedge.barcodes`, que contiene una lista de bundles, y conservar todos sus campos.

## Modo 1: Single

Ejecutar primero con el modo normal `Single`.

Registrar para cada Intent:

```text
action
timestamp
com.symbol.datawedge.source
com.symbol.datawedge.label_type
com.symbol.datawedge.data_string
com.symbol.datawedge.decoded_mode
com.symbol.datawedge.decode_data
com.symbol.datawedge.barcodes
```

Repetir:

1. A
2. A + B, realizando dos activaciones separadas
3. A + A, realizando dos activaciones separadas
4. A + A + B, realizando tres activaciones separadas

Este modo prueba lecturas sucesivas, no varios codigos dentro de una misma imagen. No debe interpretarse como conteo fisico de codigos en un frame.

## Modo 2: MultiBarcode

Activar `NG SimulScan Configuration` y seleccionar `MultiBarcode`.

Para la primera ejecución:

```text
Instant Reporting: Disabled
Report Decoded Barcodes: Enabled
Minimum number of barcodes: 1 o el minimo necesario
Maximum number of barcodes: 10
```

Si el dispositivo requiere cantidad fija, repetir con:

```text
Specific number of barcodes per scan: 1, 2 y 3
```

Para cada captura registrar:

```text
cantidad de Intents recibidos
timestamp de cada Intent
com.symbol.datawedge.decoded_mode
com.symbol.datawedge.data_string
com.symbol.datawedge.barcodes
cantidad de bundles en com.symbol.datawedge.barcodes
data_string de cada bundle
label_type de cada bundle
decode_data de cada bundle
orden de los bundles
```

Matriz experimental:

| Prueba | Resultado a verificar |
| --- | --- |
| A | un lote con una ocurrencia |
| A + B | dos ocurrencias, posiblemente en un Intent o varios según la configuracion |
| A + A | verificar si devuelve una o dos ocurrencias |
| A + A + B | verificar si devuelve dos o tres ocurrencias |

La documentacion oficial de DataWedge 15 indica que MultiBarcode adquiere codigos multiples unicos y que los duplicados se decodifican una sola vez. Por ello, la expectativa documentada para `A + A` es una sola ocurrencia, pero debe confirmarse en el modelo y version concretos.

Tambien documenta que:

- `Instant Reporting` reporta cada codigo unico inmediatamente;
- sin `Instant Reporting`, el resultado puede entregarse como una entidad al cumplir la cantidad configurada;
- los datos MultiBarcode en Intent Output se representan mediante una lista de bundles;
- los datos MultiBarcode en Keystroke Output pueden concatenarse, razon por la cual no se usa ese mecanismo en esta prueba.

## Modo 3: MultiBarcode con Instant Reporting

Repetir la matriz con:

```text
Instant Reporting: Enabled
```

Registrar si:

- A genera un Intent;
- A + B genera dos Intents o un lote;
- A + A genera un solo Intent por la regla de unicidad;
- A + A + B genera dos Intents o un lote de dos valores.

Este modo es util para conocer la latencia y la forma de entrega, pero no se espera que resuelva duplicados fisicos porque la documentacion indica que ignora duplicados.

## Formato de registro

Para cada evento guardar una entrada similar a esta, sin eliminar extras desconocidos:

```json
{
  "test": "A + A + B",
  "receivedAt": "2026-09-07T12:00:00.000Z",
  "intentAction": "com.rasi.datawedge.TECHNICAL_TEST",
  "extras": {
    "com.symbol.datawedge.source": "...",
    "com.symbol.datawedge.label_type": "...",
    "com.symbol.datawedge.data_string": "...",
    "com.symbol.datawedge.decoded_mode": "...",
    "com.symbol.datawedge.barcodes": [
      {
        "data_string": "...",
        "label_type": "..."
      }
    ]
  }
}
```

El ejemplo anterior es solamente el formato del registro. No representa un payload real recibido.

## Criterio de decision

### Caso 1: DataWedge permite duplicados fisicos

Se confirma solamente si una captura fisica `A + A` entrega dos resultados distinguibles, por ejemplo dos bundles o dos eventos separados asociados a la misma captura.

```ts
["A", "A"]
```

### Caso 2: DataWedge no permite duplicados directamente

Si `A + A` devuelve solo:

```ts
["A"]
```

y no existe metadata de multiplicidad, DataWedge MultiBarcode no satisface el requisito de conteo fisico.

La aplicacion no debe inferir una segunda unidad a partir de una sola lectura.

### Caso 3: otro modo puede servir

Probar adicionalmente, sin mezclar sus resultados con MultiBarcode:

- Single con activaciones sucesivas;
- Continuous Read;
- Document Capture MultiBarcode, si aparece disponible para el dispositivo;
- configuraciones de Barcode Highlighting o Workflow que reporten cada entidad.

Cada modo debe validarse con A + A real. Continuous Read puede reportar repetidamente el mismo simbolo y, por tanto, no demuestra por si solo que existan dos etiquetas fisicas.

## Conclusión provisional

Sin Zebra conectado no existe resultado experimental todavía.

La conclusion tecnica basada en la documentacion oficial es:

```text
DataWedge MultiBarcode no garantiza los duplicados fisicos necesarios.
Su comportamiento documentado es conservar codigos unicos dentro de la sesion.
```

Por tanto, actualmente la respuesta es:

```text
Caso 2: DataWedge MultiBarcode no permite obtener directamente los duplicados fisicos.
```

El Caso 1 solo puede declararse despues de una prueba real que demuestre que otro modo o configuracion entrega dos ocurrencias distinguibles.

## Recomendacion para el provider futuro

No crear todavia `ZebraScannerProvider`.

Despues de completar la prueba:

1. Si DataWedge entrega lotes con duplicados, crear un adaptador que convierta cada bundle a `string[]` sin aplicar `Set`.
2. Si DataWedge solo entrega valores unicos, no usar MultiBarcode para el conteo fisico.
3. Evaluar AI Data Capture `BarcodeDecoder` con duplicados habilitados y `EntityTrackerAnalyzer` si el conteo fisico es obligatorio.
4. Mantener en `useScanner` el rearmado, la deduplicacion entre frames, las cantidades y los callbacks.

El contrato de datos `string[]` sigue siendo adecuado. La decision pendiente es el transporte: DataWedge es orientado a eventos/Intents, mientras que el provider ZXing actual es orientado a lectura de frames.

## Cambios realizados en RASI

Ninguno de los archivos funcionales fue modificado. No se instalaron dependencias Zebra, no se creo un provider y no se cambio la aplicacion React/Vite.

## Referencias oficiales

- [DataWedge About](https://techdocs.zebra.com/datawedge/latest/guide/about/)
- [DataWedge Barcode Input](https://techdocs.zebra.com/datawedge/latest/guide/input/barcode/)
- [DataWedge Intent Output](https://techdocs.zebra.com/datawedge/latest/guide/output/intent/)
- [DataWedge Set Config API](https://techdocs.zebra.com/datawedge/latest/guide/api/setconfig/)
- [DataWedge Programmer's Guide](https://techdocs.zebra.com/datawedge/latest/guide/programmers-guides/dw-programming/)
- [AI Data Capture Barcode Decoder](https://techdocs.zebra.com/ai-datacapture/4-1/barcodedecoder/)