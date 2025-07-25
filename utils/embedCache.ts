export const computeHash = async (text: string): Promise<string> => {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('paper_embed_cache', 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore('embeds');
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
};

export const getEmbedding = async (text: string): Promise<number[]> => {
  const hash = await computeHash(text);
  const db = await getDb();
  return new Promise((resolve) => {
    const tx = db.transaction('embeds', 'readonly');
    const store = tx.objectStore('embeds');
    const req = store.get(hash);
    req.onsuccess = async () => {
      if (req.result) {
        resolve(req.result);
      } else {
        const embed = Array.from({ length: 3 }, () => Math.random());
        const wtx = db.transaction('embeds', 'readwrite');
        wtx.objectStore('embeds').put(embed, hash);
        resolve(embed);
      }
    };
  });
};
