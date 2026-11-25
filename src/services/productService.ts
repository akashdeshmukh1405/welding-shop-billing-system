import { Product } from "../types";
import { storageService } from "./storageService";

class ProductService {
  public getProducts(searchQuery?: string): Product[] {
    const products = storageService.getProducts();
    if (!searchQuery || !searchQuery.trim()) {
      return products;
    }
    const q = searchQuery.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }

  public getProductById(id: string): Product | undefined {
    return storageService.getProducts().find((p) => p.id === id);
  }

  public createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Product {
    const products = storageService.getProducts();
    const nowIso = new Date().toISOString();

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: data.name.trim(),
      description: data.description?.trim(),
      defaultPrice: data.defaultPrice,
      unit: data.unit,
      category: data.category?.trim() || 'General',
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    products.unshift(newProduct);
    storageService.saveProducts(products);
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const products = storageService.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const current = products[index];
    const updated: Product = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    products[index] = updated;
    storageService.saveProducts(products);
    return updated;
  }

  public deleteProduct(id: string): boolean {
    const products = storageService.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    if (filtered.length === products.length) return false;
    storageService.saveProducts(filtered);
    return true;
  }
}

export const productService = new ProductService();
