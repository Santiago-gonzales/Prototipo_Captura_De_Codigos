import { useState } from "react";
import type { ScanItem } from "../types/scan";

interface ResultsTableProps {
  items: ScanItem[];
  accumulated?: boolean;
  onQuantityChange?: (barcode: string, newQuantity: number) => void;
}

export function ResultsTable({ 
  items, 
  accumulated = false,
  onQuantityChange 
}: ResultsTableProps) {
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const handleEditStart = (barcode: string, currentQuantity: number) => {
    setEditingBarcode(barcode);
    setEditingValue(String(currentQuantity));
  };

  const handleEditCancel = () => {
    setEditingBarcode(null);
    setEditingValue("");
  };

  const handleEditSave = (barcode: string) => {
    let numValue = parseInt(editingValue, 10);

    // Validate: only non-negative integers
    if (isNaN(numValue) || numValue < 0) {
      numValue = 0;
    }

    onQuantityChange?.(barcode, numValue);
    handleEditCancel();
  };

  const handleEditInputChange = (value: string) => {
    setEditingValue(value);
  };

  const handleEditKeyDown = (barcode: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleEditSave(barcode);
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  return (
    <div id={accumulated ? "results" : "snapshotResults"} className="results">
      {items.map((item) => (
        <div className="code-row" key={item.barcode}>
          <div className="code-value">{item.barcode}</div>
          {accumulated && <div className="code-product">{item.product?.name || "Producto no encontrado"}</div>}
          {accumulated && <div className="code-description">{item.product?.description || "-"}</div>}
          {accumulated && <div className="code-status">{item.product ? (item.product.status ? "Activo" : "Inactivo") : "No encontrado"}</div>}
          {accumulated ? (
            <div className="code-quantity-container">
              {editingBarcode === item.barcode ? (
                <>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="code-quantity-edit"
                    value={editingValue}
                    onChange={(e) => handleEditInputChange(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(item.barcode, e)}
                    autoFocus
                  />
                  <button
                    className="quantity-action-btn save-btn"
                    onClick={() => handleEditSave(item.barcode)}
                    title="Guardar cantidad"
                  >
                    ✓
                  </button>
                  <button
                    className="quantity-action-btn cancel-btn"
                    onClick={handleEditCancel}
                    title="Cancelar edición"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <div className="code-quantity">{item.quantity}</div>
                  <button
                    className="quantity-action-btn edit-btn"
                    onClick={() => handleEditStart(item.barcode, item.quantity)}
                    title="Editar cantidad"
                  >
                    ✏️
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="code-quantity">{item.quantity}</div>
          )}
        </div>
      ))}
    </div>
  );
}
