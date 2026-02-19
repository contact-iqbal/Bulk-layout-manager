export interface CardData {
  id: string;
  tabId?: string; // Optional for backward compatibility, but should be used
  name?: string; // Custom name for the card
  imgSrc: string;
  customLogo?: string; // Specific logo for this card
  coords: string;
  jenis: string;
  ukuran: string;
  lokasi: string;
  keterangan: string;
  timestamp: number;
}

const DB_NAME = "LayoutGeneratorDB";
const DB_VERSION = 2; // Incremented for history store
const STORE_NAME = "cards";
const HISTORY_STORE = "history";

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: "tabId" });
      }
    };
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

export async function saveCardToDB(cardData: CardData): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const request = transaction.objectStore(STORE_NAME).put(cardData);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCardFromDB(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const request = transaction.objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCards(tabId?: string): Promise<CardData[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const allCards = request.result as CardData[];
      if (tabId) {
        const filtered = allCards.filter((c) => c.tabId === tabId);
        resolve(filtered);
      } else {
        resolve(allCards);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveHistoryToDB(
  tabId: string,
  past: any[],
  future: any[],
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE], "readwrite");
    const request = transaction.objectStore(HISTORY_STORE).put({
      tabId,
      past,
      future,
      timestamp: Date.now(),
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getHistoryFromDB(
  tabId?: string,
): Promise<any | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE], "readonly");
    const store = transaction.objectStore(HISTORY_STORE);
    
    if (tabId) {
      const request = store.get(tabId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    } else {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    }
  });
}

export async function clearAllData(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, HISTORY_STORE], "readwrite");
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(HISTORY_STORE).clear();
  });
}
