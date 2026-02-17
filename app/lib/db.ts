export interface CardData {
  id: string;
  tabId?: string; // Optional for backward compatibility, but should be used
  imgSrc: string;
  coords: string;
  jenis: string;
  ukuran: string;
  lokasi: string;
  keterangan: string;
  timestamp: number;
}

const DB_NAME = "LayoutGeneratorDB";
const DB_VERSION = 1;
const STORE_NAME = "cards";

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
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
        // Filter by tabId.
        // Note: For existing cards without tabId, they might disappear or show in specific tab.
        // Let's assume blank tabId implies 'legacy' or 'global' if we wanted,
        // but for this requirement, we only show cards matching the tabId.
        const filtered = allCards.filter((c) => c.tabId === tabId);
        resolve(filtered);
      } else {
        resolve(allCards);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
