/**
 * Offline IndexedDB Storage Layer for Welding Shop POS
 * Ensures transactions on iPads, tablets, and field laptops are safely persisted
 * offline and synchronized without creating duplicate invoices or duplicate payments.
 */

const DB_NAME = "WeldingShopPOS_OfflineDB";
const DB_VERSION = 1;

export interface SyncQueueItem {
  id: string;
  type: "CREATE_INVOICE" | "COLLECT_PAYMENT" | "CREATE_CUSTOMER";
  payload: any;
  createdAt: string;
  idempotencyKey: string;
  synced: boolean;
  attempts: number;
  lastError?: string;
}

class OfflineDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.isBrowser()) {
      return Promise.reject(new Error("IndexedDB is only available in browser"));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Invoices Store
          if (!db.objectStoreNames.contains("invoices")) {
            const invoiceStore = db.createObjectStore("invoices", { keyPath: "id" });
            invoiceStore.createIndex("invoiceNumber", "invoiceNumber", { unique: true });
            invoiceStore.createIndex("syncStatus", "syncStatus", { unique: false });
          }

          // 2. Payments Store
          if (!db.objectStoreNames.contains("payments")) {
            const paymentStore = db.createObjectStore("payments", { keyPath: "id" });
            paymentStore.createIndex("invoiceId", "invoiceId", { unique: false });
            paymentStore.createIndex("syncStatus", "syncStatus", { unique: false });
          }

          // 3. Customers Store
          if (!db.objectStoreNames.contains("customers")) {
            const customerStore = db.createObjectStore("customers", { keyPath: "id" });
            customerStore.createIndex("phone", "phone", { unique: true });
          }

          // 4. Sync Queue Store (FIFO)
          if (!db.objectStoreNames.contains("sync_queue")) {
            const queueStore = db.createObjectStore("sync_queue", { keyPath: "id" });
            queueStore.createIndex("idempotencyKey", "idempotencyKey", { unique: true });
            queueStore.createIndex("synced", "synced", { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  // --- Sync Queue Operations ---
  public async queueAction(
    type: SyncQueueItem["type"],
    payload: any,
    idempotencyKey: string
  ): Promise<void> {
    if (!this.isBrowser()) return;
    try {
      const db = await this.getDB();
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");

      const item: SyncQueueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload,
        createdAt: new Date().toISOString(),
        idempotencyKey,
        synced: false,
        attempts: 0,
      };

      store.put(item);
    } catch (e) {
      console.warn("Could not queue action in IndexedDB:", e);
    }
  }

  public async getPendingQueue(): Promise<SyncQueueItem[]> {
    if (!this.isBrowser()) return [];
    try {
      const db = await this.getDB();
      const tx = db.transaction("sync_queue", "readonly");
      const store = tx.objectStore("sync_queue");
      const index = store.index("synced");

      return new Promise((resolve) => {
        const req = index.getAll(IDBKeyRange.only(false as any));
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async markQueueItemSynced(id: string): Promise<void> {
    if (!this.isBrowser()) return;
    try {
      const db = await this.getDB();
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");

      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          req.result.synced = true;
          store.put(req.result);
        }
      };
    } catch (e) {
      console.warn("Could not mark sync queue item as synced:", e);
    }
  }

  public async getPendingSyncCount(): Promise<number> {
    const queue = await this.getPendingQueue();
    return queue.length;
  }
}

export const offlineDB = new OfflineDB();
