import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'rider-offline-sync';
const STORE_NAME = 'sync-queue';
const DB_VERSION = 1;

export interface SyncAction {
  id?: number;
  type: 'UPDATE_ORDER_STATUS' | 'LOG_EARNINGS' | 'SOS_ALERT' | 'LOCATION_UPDATE';
  payload: any;
  timestamp: number;
  retryCount: number;
}

export class RiderSyncService {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }

  async queueAction(action: Omit<SyncAction, 'timestamp' | 'retryCount'>) {
    const db = await this.db;
    const syncAction: SyncAction = {
      ...action,
      timestamp: Date.now(),
      retryCount: 0,
    };
    await db.add(STORE_NAME, syncAction);
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (!navigator.onLine) return;

    const db = await this.db;
    const allActions: SyncAction[] = await db.getAll(STORE_NAME);

    for (const action of allActions) {
      try {
        await this.executeAction(action);
        await db.delete(STORE_NAME, action.id!);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        action.retryCount++;
        if (action.retryCount > 5) {
          // Move to dead letter or just delete after too many retries
          await db.delete(STORE_NAME, action.id!);
        } else {
          await db.put(STORE_NAME, action);
        }
      }
    }
  }

  private async executeAction(action: SyncAction) {
    // This will be implemented in the component or passed as a callback
    // For now, we'll emit a custom event that the main page can listen to
    const event = new CustomEvent('rider-sync-action', { detail: action });
    window.dispatchEvent(event);
  }

  async getQueuedCount() {
    const db = await this.db;
    return db.count(STORE_NAME);
  }
}

export const riderSync = new RiderSyncService();
