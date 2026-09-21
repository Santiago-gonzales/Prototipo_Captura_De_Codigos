# Prototipo de captura múltiple — Etapa 1 / Prueba 1

## Qué ocurrió con la primera versión

La primera versión dependía de la API nativa `BarcodeDetector`. Esa API tiene soporte limitado entre navegadores, por lo que puede no estar disponible en Chrome/otros entornos.

Esta versión cambia el motor de lectura por **ZXing**, una biblioteca de código abierto para lectura de códigos desde JavaScript. El prototipo utiliza su lector de múltiples códigos para analizar cada imagen de la cámara.

## Objetivo actual

Demostrar primero:

**Cámara → varios códigos visibles → códigos detectados → lista de códigos únicos**

Todavía NO:
- integración con RASI;
- usuarios/login;
- inventario;
- lotes;
- cantidades definitivas;
- Excel.

## Prueba

1. En VS Code abre `index.html` con Live Server.
2. En el PC comprueba que la página abre.
3. Pulsa **Iniciar cámara** y concede permiso.
4. Coloca varios códigos de barras frente a la cámara.
5. Comprueba si aparecen varios códigos en la lista.
6. Luego haremos la misma prueba desde celular/tablet.

## Nota

La detección múltiple en una cámara de video es una prueba técnica: el rendimiento puede variar según navegador, cámara, iluminación, tamaño y separación de los códigos.

Si la detección web resulta insuficiente, la siguiente alternativa será evaluar una aplicación Android con Zebra AI Data Capture SDK para validar específicamente la tecnología Zebra.
# Prototipo_Captura_De_Codigos
