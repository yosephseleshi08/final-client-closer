/**
 * Persistent IndexedDB Storage for Lead Mockup Screenshots
 * Provides robust offline-first image persistence that doesn't breach the 5MB localStorage quota.
 */

const DB_NAME = 'OutreachPro_MediaVault';
const DB_VERSION = 1;
const STORE_NAME = 'mockup_images';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Save an image (dataURL string or Blob) to IndexedDB by key
 */
export async function saveMockupImage(key: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(dataUrl, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to save mockup to IndexedDB for key "${key}":`, err);
    // Fallback: in-memory / session fallback
    try {
      sessionStorage.setItem(`mockup_${key}`, dataUrl);
    } catch (_e) {}
  }
}

/**
 * Retrieve an image from IndexedDB by key
 */
export async function getMockupImage(key: string): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const val = request.result;
        if (typeof val === 'string') {
          resolve(val);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`Failed to read mockup from IndexedDB for key "${key}":`, err);
    try {
      return sessionStorage.getItem(`mockup_${key}`);
    } catch (_e) {
      return null;
    }
  }
}

/**
 * Delete an image from IndexedDB by key
 */
export async function deleteMockupImage(key: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to delete mockup from IndexedDB for key "${key}":`, err);
    try {
      sessionStorage.removeItem(`mockup_${key}`);
    } catch (_e) {}
  }
}

/**
 * Generate a deterministic storage key for a lead's mockup
 */
export function getMockupStorageKey(channel: string, leadId: string): string {
  return `mockup_${channel.toLowerCase()}_${leadId}`;
}
