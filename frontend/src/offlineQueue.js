// v1.6 — offline work-request queue, backed by IndexedDB (not
// localStorage: queued items carry photo Blobs, which localStorage can't
// hold and which would blow past its ~5MB quota almost immediately).
// IndexedDB's structured-clone storage accepts Blobs natively, so a
// queued item's photos are kept as real File/Blob objects until they're
// uploaded at sync time — no base64 round-tripping needed.
//
// Each queued item looks like:
//   { id, type: "workRequest", form: {...}, photos: [File, ...],
//     requestedBy, queuedAt, status: "pending"|"syncing"|"failed", error }

const DB_NAME = "maintenhance-offline";
const DB_VERSION = 1;
const STORE = "queue";

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB is not available")); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(STORE)) idb.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Couldn't open the offline queue database"));
  });
}

export async function queueItem(item) {
  const idb = await openDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve(item.id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedItems() {
  const idb = await openDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => (a.queuedAt || "").localeCompare(b.queuedAt || "")));
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedItem(id) {
  const idb = await openDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateQueuedItem(id, patch) {
  const idb = await openDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (!getReq.result) return;
      store.put({ ...getReq.result, ...patch });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
