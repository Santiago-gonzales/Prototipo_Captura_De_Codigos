import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { ScanItem } from "../types/scan";

interface ProductLookupProps {
  items: ScanItem[];
  activeBarcode: string | null;
  status: "idle" | "loading" | "found" | "not-found" | "error";
}

export function ProductLookup({ items, activeBarcode, status }: ProductLookupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const pointerStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((index) => Math.min(index, items.length - 1));
  }, [items.length]);

  const currentItem = items[currentIndex];
  const product = currentItem?.product;
  const barcode = currentItem?.barcode ?? null;
  const isActiveLookup = barcode !== null && barcode === activeBarcode;
  const currentStatus = product
    ? "found"
    : isActiveLookup
      ? status
      : product === null
        ? "not-found"
        : "loading";

  const goToPrevious = () => setCurrentIndex((index) => Math.max(index - 1, 0));
  const goToNext = () => setCurrentIndex((index) => Math.min(index + 1, items.length - 1));

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const startX = pointerStartXRef.current;
    pointerStartXRef.current = null;
    if (startX === null) return;

    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) < 45) return;
    if (deltaX < 0) goToNext();
    else goToPrevious();
  };

  return (
    <section className="product-card" aria-live="polite">
      <div className="section-label"><span>02</span> / PRODUCTO</div>
      <div className="product-viewer">
        {items.length > 1 && (
          <button type="button" className="product-nav" onClick={goToPrevious} disabled={currentIndex === 0} aria-label="Producto anterior">‹</button>
        )}
        <div
          className="product-content product-swipe-area"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { pointerStartXRef.current = null; }}
        >
          <div className="product-title-row">
            <h2>Identificación de producto</h2>
            {items.length > 0 && <span className="product-position">{currentIndex + 1} / {items.length}</span>}
          </div>
          {items.length === 0 && <p className="product-message">El producto detectado aparecerá aquí.</p>}
          {items.length > 0 && currentStatus === "loading" && <p className="product-message">Consultando producto...</p>}
          {items.length > 0 && currentStatus === "not-found" && <p className="product-message">Producto no encontrado: {barcode}</p>}
          {items.length > 0 && currentStatus === "error" && <p className="product-message">No fue posible consultar el producto.</p>}
          {items.length > 0 && currentStatus === "found" && product && (
            <dl className="product-details">
              <div><dt>Barcode</dt><dd>{product.barcode}</dd></div>
              <div><dt>Nombre</dt><dd>{product.name}</dd></div>
              <div><dt>Descripción</dt><dd>{product.description || "Sin descripción"}</dd></div>
              <div><dt>Estado</dt><dd>{product.status ? "Activo" : "Inactivo"}</dd></div>
            </dl>
          )}
          {items.length > 0 && currentStatus === "not-found" && (
            <dl className="product-details product-fallback-details">
              <div><dt>Barcode</dt><dd>{barcode}</dd></div>
              <div><dt>Producto</dt><dd>No encontrado</dd></div>
              <div><dt>Estado</dt><dd>No disponible</dd></div>
            </dl>
          )}
        </div>
        {items.length > 1 && (
          <button type="button" className="product-nav" onClick={goToNext} disabled={currentIndex === items.length - 1} aria-label="Producto siguiente">›</button>
        )}
      </div>
    </section>
  );
}
