"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, PlusCircle, Minus, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { InvoiceItem, Product, ProductUnit } from "@/types";
import { storageService } from "@/services/storageService";
import { formatCurrency } from "@/lib/utils";

interface ItemRowEditorProps {
  items: InvoiceItem[];
  onChange: (items: InvoiceItem[]) => void;
  error?: string;
}

const UNIT_OPTIONS: { label: string; value: ProductUnit }[] = [
  { label: "Piece (pc)", value: "piece" },
  { label: "Sq. Feet (sq.ft)", value: "sq.ft" },
  { label: "Kilogram (kg)", value: "kg" },
  { label: "Running Feet (ft)", value: "feet" },
  { label: "Meter (m)", value: "meter" },
  { label: "Hours (hr)", value: "hour" },
  { label: "Set", value: "set" },
  { label: "Metric Ton", value: "ton" },
  { label: "Inch", value: "inch" },
];

export function ItemRowEditor({ items, onChange, error }: ItemRowEditorProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(storageService.getProducts());
  }, []);

  const handleAddItem = (product?: Product) => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product?.id,
      name: product?.name || "",
      description: product?.description || "",
      quantity: 1,
      unit: product?.unit || "piece",
      unitPrice: product?.defaultPrice || 0,
      total: product?.defaultPrice ? product.defaultPrice * 1 : 0,
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    if (field === "quantity" || field === "unitPrice") {
      const q = field === "quantity" ? Number(value) : current.quantity;
      const p = field === "unitPrice" ? Number(value) : current.unitPrice;
      current.total = (isNaN(q) ? 0 : q) * (isNaN(p) ? 0 : p);
    }

    // If changing product from select dropdown
    if (field === "productId") {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        current.name = prod.name;
        current.description = prod.description || "";
        current.unit = prod.unit;
        current.unitPrice = prod.defaultPrice;
        current.total = current.quantity * prod.defaultPrice;
      }
    }

    updated[index] = current;
    onChange(updated);
  };

  const handleStepQuantity = (index: number, delta: number) => {
    const item = items[index];
    const newQty = Math.max(0.5, (item.quantity || 1) + delta);
    handleItemChange(index, "quantity", newQty);
  };

  return (
    <div className="space-y-4">
      {/* Quick Add Preset Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Add Welding Items
          </label>
          <span className="text-xs text-slate-400">Tap to insert item</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {products.slice(0, 6).map((prod) => (
            <button
              key={prod.id}
              type="button"
              onClick={() => handleAddItem(prod)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>{prod.name}</span>
              <span className="text-slate-400 font-normal">({formatCurrency(prod.defaultPrice)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
            <Layers className="w-8 h-8 mx-auto text-slate-400" />
            <div>
              <p className="text-sm font-bold text-slate-700">No items added to bill yet</p>
              <p className="text-xs text-slate-500 mt-0.5">Click quick items above or add custom welding work</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleAddItem()}
              className="mt-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add Custom Item
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id || index}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 relative group"
              >
                {/* Header of Item Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="Product or service name (e.g. MS Gate, Window Grill)"
                      value={item.name}
                      required
                      onChange={(e) => handleItemChange(index, "name", e.target.value)}
                      className="w-full text-base font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Optional Spec / Description */}
                <div>
                  <input
                    type="text"
                    placeholder="Description / dimensions / specs (optional, e.g. 5x7 ft with primer coat)"
                    value={item.description || ""}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    className="w-full text-xs text-slate-600 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:bg-white focus:border-blue-400"
                  />
                </div>

                {/* Controls Grid (Quantity, Unit, Price, Total) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end pt-1">
                  {/* Quantity Stepper */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Quantity</label>
                    <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => handleStepQuantity(index, -1)}
                        className="w-9 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 active:bg-slate-200"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-full text-center text-sm font-bold text-slate-900 focus:outline-none h-10"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepQuantity(index, 1)}
                        className="w-9 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 active:bg-slate-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Unit Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, "unit", e.target.value as ProductUnit)}
                      className="w-full h-10 px-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Rate / Price (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.unitPrice === 0 ? "" : item.unitPrice}
                        onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full h-10 pl-7 pr-3 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right flex flex-col justify-end">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Item Total</label>
                    <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-end font-extrabold text-sm text-slate-900">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

        {/* Add Row Button */}
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => handleAddItem()}
          className="w-full border-dashed border-2 hover:border-slate-400"
        >
          <PlusCircle className="w-4 h-4 text-blue-600" />
          Add Another Product / Service Item
        </Button>
      </div>
    </div>
  );
}
