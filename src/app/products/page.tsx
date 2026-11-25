"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Sparkles,
  Tag,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { storageService } from "@/services/storageService";
import { productService } from "@/services/productService";
import { useToast } from "@/context/ToastContext";
import { Product, ProductUnit } from "@/types";
import { formatCurrency } from "@/lib/utils";

const UNITS: { label: string; value: ProductUnit }[] = [
  { label: "Piece (pc)", value: "piece" },
  { label: "Sq. Feet (sq.ft)", value: "sq.ft" },
  { label: "Kilogram (kg)", value: "kg" },
  { label: "Running Feet (ft)", value: "feet" },
  { label: "Meter (m)", value: "meter" },
  { label: "Hour (hr)", value: "hour" },
  { label: "Set", value: "set" },
  { label: "Ton", value: "ton" },
  { label: "Inch", value: "inch" },
];

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
  const [unit, setUnit] = useState<ProductUnit>("piece");
  const [category, setCategory] = useState("Gates");
  const [formError, setFormError] = useState("");

  const loadProducts = () => {
    let list = productService.getProducts(searchQuery);
    if (selectedCategory !== "ALL") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    setProducts(list);
  };

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory]);

  const categories = ["ALL", ...Array.from(new Set(storageService.getProducts().map((p) => p.category || "General")))];

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setDefaultPrice(0);
    setUnit("piece");
    setCategory("Gates");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || "");
    setDefaultPrice(p.defaultPrice);
    setUnit(p.unit);
    setCategory(p.category || "General");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Product/Service name is required");
      return;
    }
    if (defaultPrice < 0) {
      setFormError("Price cannot be negative");
      return;
    }

    if (editingProduct) {
      productService.updateProduct(editingProduct.id, {
        name,
        description: description || undefined,
        defaultPrice,
        unit,
        category,
      });
      toast.success(`Updated ${name}`);
    } else {
      productService.createProduct({
        name,
        description: description || undefined,
        defaultPrice,
        unit,
        category,
      });
      toast.success(`Added ${name} to catalog`);
    }

    setIsModalOpen(false);
    loadProducts();
  };

  const handleDeleteConfirm = () => {
    if (!productToDelete) return;
    productService.deleteProduct(productToDelete.id);
    toast.success(`Deleted ${productToDelete.name}`);
    setProductToDelete(null);
    loadProducts();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Product & Service Master
          </h1>
          <p className="text-xs text-slate-500">
            Saved welding and fabrication items for quick 1-tap bill creation
          </p>
        </div>

        <Button onClick={handleOpenAdd} variant="primary" size="lg" className="font-bold">
          <Plus className="w-5 h-5" />
          Add Item to Catalog
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Search items, specs, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description={
            searchQuery
              ? `No items match "${searchQuery}"`
              : "Your catalog is empty. Add commonly billed items like MS Gates, Grills, or Railings."
          }
          actionLabel="Add Item"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <Card
              key={p.id}
              className="p-5 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 mb-1.5">
                      {p.category || "General"}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                      {p.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-900">{formatCurrency(p.defaultPrice)}</p>
                    <p className="text-[11px] font-semibold text-slate-500">per {p.unit}</p>
                  </div>
                </div>

                {p.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <Button
                  onClick={() => handleOpenEdit(p)}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold h-8"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  onClick={() => setProductToDelete(p)}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 h-8 px-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Edit Master Item" : "Add Item to Master Catalog"}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Product or Service Name"
            placeholder="e.g. MS Safety Balcony Grill"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFormError("");
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Default Rate / Price (₹)"
              type="number"
              min="0"
              required
              prefixText="₹"
              value={defaultPrice === 0 ? "" : defaultPrice}
              onChange={(e) => setDefaultPrice(parseFloat(e.target.value) || 0)}
            />

            <Select
              label="Standard Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as ProductUnit)}
              options={UNITS}
            />
          </div>

          <Input
            label="Category"
            placeholder="e.g. Gates, Grills, Railing, Sheds, Shutters, Services"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700">Item Description / Specifications</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Mild steel heavy gauge square bar grill with anti-rust primer and matte black coating"
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {formError && <p className="text-xs font-bold text-red-600">{formError}</p>}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="font-bold">
              {editingProduct ? "Save Changes" : "Add to Catalog"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Item?"
        message={`Are you sure you want to remove "${productToDelete?.name}" from your catalog? Existing generated bills will not be affected.`}
        confirmText="Delete"
      />
    </div>
  );
}
