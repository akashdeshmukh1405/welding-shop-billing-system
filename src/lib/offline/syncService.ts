import { offlineDB, SyncQueueItem } from "./indexedDb";
import { storageService } from "@/services/storageService";

export type SyncStatusState = "ONLINE_SYNCED" | "OFFLINE_LOCAL" | "SYNCING" | "SYNC_ERROR";

export interface SyncState {
  status: SyncStatusState;
  pendingCount: number;
  lastSyncedAt?: string;
  errorMessage?: string;
}

class SyncService {
  private listeners: Array<(state: SyncState) => void> = [];
  private state: SyncState = {
    status: "ONLINE_SYNCED",
    pendingCount: 0,
  };

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
      this.refreshPendingCount();
    }
  }

  public subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.state));
  }

  public async refreshPendingCount(): Promise<number> {
    const count = await offlineDB.getPendingSyncCount();
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    this.state = {
      ...this.state,
      pendingCount: count,
      status: !isOnline ? "OFFLINE_LOCAL" : count > 0 ? "OFFLINE_LOCAL" : "ONLINE_SYNCED",
    };
    this.notify();
    return count;
  }

  private async handleNetworkChange(isOnline: boolean): Promise<void> {
    if (isOnline) {
      await this.triggerSync();
    } else {
      this.state = {
        ...this.state,
        status: "OFFLINE_LOCAL",
      };
      this.notify();
    }
  }

  /**
   * Safe sync engine with duplicate prevention
   */
  public async triggerSync(): Promise<{ success: boolean; syncedCount: number }> {
    const queue = await offlineDB.getPendingQueue();
    if (queue.length === 0) {
      this.state = {
        ...this.state,
        status: "ONLINE_SYNCED",
        pendingCount: 0,
        lastSyncedAt: new Date().toISOString(),
      };
      this.notify();
      return { success: true, syncedCount: 0 };
    }

    this.state = {
      ...this.state,
      status: "SYNCING",
    };
    this.notify();

    let syncedCount = 0;

    for (const item of queue) {
      try {
        if (item.type === "CREATE_INVOICE") {
          // Check for duplicate invoice in localStorage / server
          const existingInvoices = storageService.getInvoices();
          const alreadyExists = existingInvoices.some(
            (inv) =>
              inv.id === item.payload.id ||
              inv.invoiceNumber === item.payload.invoiceNumber
          );

          if (!alreadyExists) {
            storageService.saveInvoice(item.payload);
          }
          await offlineDB.markQueueItemSynced(item.id);
          syncedCount++;
        } else if (item.type === "COLLECT_PAYMENT") {
          const existingPayments = storageService.getPayments();
          const alreadyExists = existingPayments.some(
            (pay) => pay.id === item.payload.id || (pay.invoiceId === item.payload.invoiceId && pay.amount === item.payload.amount && pay.date === item.payload.date)
          );

          if (!alreadyExists) {
            storageService.savePayment(item.payload);
          }
          await offlineDB.markQueueItemSynced(item.id);
          syncedCount++;
        }
      } catch (err: any) {
        console.error("Failed to sync item:", item, err);
      }
    }

    const remaining = await offlineDB.getPendingSyncCount();
    this.state = {
      ...this.state,
      status: remaining === 0 ? "ONLINE_SYNCED" : "OFFLINE_LOCAL",
      pendingCount: remaining,
      lastSyncedAt: new Date().toISOString(),
    };
    this.notify();

    return { success: remaining === 0, syncedCount };
  }
}

export const syncService = new SyncService();
