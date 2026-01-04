/**
 * IndexedDB Storage for Large JSON Files
 * Provides efficient storage and retrieval of large JSON content
 * without keeping everything in memory
 */

const DB_NAME = "JsonRepairDB";
const DB_VERSION = 1;
const STORE_NAME = "jsonFiles";

interface StoredFile {
  id: string;
  content: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    name?: string;
    format?: string;
    nodeCount?: number;
  };
}

/**
 * Open IndexedDB connection
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("size", "size", { unique: false });
      }
    };
  });
}

/**
 * Store large JSON content in IndexedDB
 */
export async function storeContent(
  id: string,
  content: string,
  metadata?: StoredFile["metadata"],
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const file: StoredFile = {
      id,
      content,
      size: content.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata,
    };

    const request = store.put(file);

    request.onerror = () => {
      reject(new Error("Failed to store content"));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Retrieve content from IndexedDB
 */
export async function getContent(id: string): Promise<string | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => {
      reject(new Error("Failed to retrieve content"));
    };

    request.onsuccess = () => {
      const result = request.result as StoredFile | undefined;
      resolve(result?.content || null);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get file metadata without loading full content
 */
export async function getMetadata(
  id: string,
): Promise<Omit<StoredFile, "content"> | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => {
      reject(new Error("Failed to retrieve metadata"));
    };

    request.onsuccess = () => {
      const result = request.result as StoredFile | undefined;
      if (result) {
        const { content: _content, ...metadata } = result;
        resolve(metadata);
      } else {
        resolve(null);
      }
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete content from IndexedDB
 */
export async function deleteContent(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => {
      reject(new Error("Failed to delete content"));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * List all stored files (metadata only)
 */
export async function listFiles(): Promise<Omit<StoredFile, "content">[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      reject(new Error("Failed to list files"));
    };

    request.onsuccess = () => {
      const results = request.result as StoredFile[];
      // Return metadata without content
      resolve(results.map(({ content, ...metadata }) => metadata));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get total storage used
 */
export async function getStorageUsed(): Promise<number> {
  const files = await listFiles();
  return files.reduce((total, file) => total + file.size, 0);
}

/**
 * Clear old files to free up space
 * Keeps the most recently updated files
 */
export async function clearOldFiles(
  maxFiles: number = 10,
  maxAge: number = 7 * 24 * 60 * 60 * 1000, // 7 days
): Promise<number> {
  const files = await listFiles();
  const now = Date.now();
  let deletedCount = 0;

  // Sort by updatedAt, oldest first
  files.sort((a, b) => a.updatedAt - b.updatedAt);

  // Delete old files
  for (const file of files) {
    const isOld = now - file.updatedAt > maxAge;
    const exceedsLimit = files.length - deletedCount > maxFiles;

    if (isOld || exceedsLimit) {
      await deleteContent(file.id);
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Get a chunk of content (for pagination)
 */
export async function getContentChunk(
  id: string,
  start: number,
  length: number,
): Promise<string | null> {
  const content = await getContent(id);
  if (!content) return null;

  return content.substring(start, start + length);
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Estimate available storage quota
 */
export async function getStorageQuota(): Promise<{
  used: number;
  available: number;
  total: number;
} | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      available: (estimate.quota || 0) - (estimate.usage || 0),
      total: estimate.quota || 0,
    };
  } catch {
    return null;
  }
}

// Current session file ID
let currentFileId: string | null = null;

/**
 * Set the current file being edited
 */
export function setCurrentFile(id: string): void {
  currentFileId = id;
}

/**
 * Get the current file ID
 */
export function getCurrentFileId(): string | null {
  return currentFileId;
}

/**
 * Store current session content
 */
export async function storeCurrentSession(content: string): Promise<void> {
  if (!currentFileId) {
    currentFileId = `session_${Date.now()}`;
  }

  await storeContent(currentFileId, content, {
    name: "Current Session",
    format: "json",
  });
}

/**
 * Restore current session content
 */
export async function restoreCurrentSession(): Promise<string | null> {
  if (!currentFileId) return null;
  return getContent(currentFileId);
}

const indexedDBStorage = {
  storeContent,
  getContent,
  getMetadata,
  deleteContent,
  listFiles,
  getStorageUsed,
  clearOldFiles,
  getContentChunk,
  isIndexedDBAvailable,
  getStorageQuota,
  setCurrentFile,
  getCurrentFileId,
  storeCurrentSession,
  restoreCurrentSession,
};

export default indexedDBStorage;
