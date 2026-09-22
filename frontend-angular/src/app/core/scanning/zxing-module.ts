import { prepareZXingModule } from 'zxing-wasm/reader';

/**
 * Por defecto zxing-wasm descarga `zxing_reader.wasm` desde jsDelivr.
 * angular.json copia el binario de node_modules a `zxing/`, y aquí se
 * redirige la carga a ese asset local para funcionar sin Internet
 * (navegador y WebView de Capacitor).
 */
export function useLocalZXingWasm(baseUri: string = document.baseURI) {
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? new URL(`zxing/${path}`, baseUri).href : prefix + path
    },
    fireImmediately: false
  });
}
