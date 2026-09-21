import type { InventoryLookup as InventoryLookupData } from "../services/api";

interface InventoryLookupProps {
  barcode: string | null;
  result: InventoryLookupData | null;
  status: "idle" | "loading" | "found" | "not-found" | "error";
}

export function InventoryLookup({ barcode, result, status }: InventoryLookupProps) {
  return (
    <section className="result-card inventory-lookup" aria-live="polite">
      <div className="section-label"><span>02</span> / CONSULTA DE CÓDIGO</div>
      {status === "idle" && <p className="empty">Pulsa “Analizar código” con un solo código frente a la cámara.</p>}
      {status === "loading" && <p className="empty">Consultando inventario...</p>}
      {status === "error" && <p className="empty">No fue posible consultar el inventario.</p>}
      {status === "not-found" && (
        <div className="inventory-message">
          <strong>Código no encontrado</strong>
          <span>{barcode}</span>
        </div>
      )}
      {status === "found" && result && (
        <div className="inventory-details">
          <div className="inventory-product">
            <span>Código de barras</span><strong>{result.barcode}</strong>
            <span>Producto</span><strong>{result.product.name}</strong>
            <span>Código</span><strong>{result.product.code}</strong>
          </div>
          <div className="inventory-lots">
            <h2>Lotes disponibles</h2>
            {result.lots.length === 0 ? <p className="empty">No disponible</p> : result.lots.map((lot, index) => (
              <div className="inventory-lot" key={`${lot.lot ?? "none"}-${lot.expirationDate ?? "none"}-${index}`}>
                <span>Lote<strong>{lot.lot || "No disponible"}</strong></span>
                <span>Vencimiento<strong>{lot.expirationDate || "No disponible"}</strong></span>
                <span>Saldo<strong>{lot.systemQuantity}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}