const DB_NAME = 'fogonero-offline';
const DB_VERSION = 1;
const CATALOG_STORE = 'catalogs';
const SONG_STORE = 'songs';
const META_STORE = 'metadata';
const QUEUE_STORE = 'syncQueue';
const LAST_OFFLINE_SCOPE_KEY = 'fogonero:last-offline-scope';

let databasePromise;

const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

const openDatabase = () => {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('Este navegador no admite almacenamiento offline.'));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(CATALOG_STORE)) {
          database.createObjectStore(CATALOG_STORE, { keyPath: 'scope' });
        }
        if (!database.objectStoreNames.contains(SONG_STORE)) {
          database.createObjectStore(SONG_STORE, { keyPath: 'cacheKey' });
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'scope' });
        }
        if (!database.objectStoreNames.contains(QUEUE_STORE)) {
          database.createObjectStore(QUEUE_STORE, { keyPath: 'cacheKey' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return databasePromise;
};

const songCacheKey = (scope, songId) => `${scope}:${songId}`;

export const getCacheScope = (token) => {
  if (!token) return 'guest';

  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(decodeURIComponent(
      atob(normalized)
        .split('')
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    ));
    return `user-${decoded.sub || 'unknown'}`;
  } catch {
    return 'user-local';
  }
};

export const saveCatalog = async (scope, songs) => {
  const database = await openDatabase();
  const transaction = database.transaction(CATALOG_STORE, 'readwrite');
  transaction.objectStore(CATALOG_STORE).put({
    scope,
    songs,
    updatedAt: new Date().toISOString(),
  });
  await transactionDone(transaction);
};

export const getCatalog = async (scope) => {
  const database = await openDatabase();
  const transaction = database.transaction(CATALOG_STORE, 'readonly');
  const record = await requestToPromise(
    transaction.objectStore(CATALOG_STORE).get(scope)
  );
  if (record) return record;

  try {
    const legacySongs = JSON.parse(localStorage.getItem('cached_songs'));
    if (!Array.isArray(legacySongs) || legacySongs.length === 0) return null;

    const summaries = legacySongs.map(({ id, title, artist }) => ({
      id,
      title,
      artist,
    }));
    await saveCatalog(scope, summaries);
    await Promise.all(
      legacySongs
        .filter((song) => song.content)
        .map((song) => saveSong(scope, song))
    );
    return {
      scope,
      songs: summaries,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const saveSong = async (scope, song) => {
  const database = await openDatabase();
  const transaction = database.transaction(SONG_STORE, 'readwrite');
  transaction.objectStore(SONG_STORE).put({
    cacheKey: songCacheKey(scope, song.id),
    scope,
    songId: song.id,
    song,
    updatedAt: new Date().toISOString(),
  });
  await transactionDone(transaction);
};

export const getSong = async (scope, songId) => {
  const database = await openDatabase();
  const transaction = database.transaction(SONG_STORE, 'readonly');
  const record = await requestToPromise(
    transaction.objectStore(SONG_STORE).get(songCacheKey(scope, songId))
  );
  return record?.song || null;
};

export const saveLibrary = async (scope, songs) => {
  const database = await openDatabase();
  const transaction = database.transaction(
    [CATALOG_STORE, SONG_STORE, META_STORE],
    'readwrite'
  );
  const now = new Date().toISOString();

  transaction.objectStore(CATALOG_STORE).put({
    scope,
    songs: songs.map(({ id, title, artist }) => ({ id, title, artist })),
    updatedAt: now,
  });

  const songStore = transaction.objectStore(SONG_STORE);
  songs.forEach((song) => {
    songStore.put({
      cacheKey: songCacheKey(scope, song.id),
      scope,
      songId: song.id,
      song,
      updatedAt: now,
    });
  });

  transaction.objectStore(META_STORE).put({
    scope,
    count: songs.length,
    downloadedAt: now,
  });

  await transactionDone(transaction);
  localStorage.setItem(LAST_OFFLINE_SCOPE_KEY, scope);

  if (navigator.storage?.persist) {
    await navigator.storage.persist().catch(() => false);
  }
};

export const getLibraryStatus = async (scope) => {
  const database = await openDatabase();
  const transaction = database.transaction(META_STORE, 'readonly');
  return requestToPromise(transaction.objectStore(META_STORE).get(scope));
};

export const getPreferredOfflineScope = async () => {
  const database = await openDatabase();
  const preferredScope = localStorage.getItem(LAST_OFFLINE_SCOPE_KEY);

  if (preferredScope) {
    const transaction = database.transaction(META_STORE, 'readonly');
    const preferred = await requestToPromise(
      transaction.objectStore(META_STORE).get(preferredScope)
    );
    if (preferred?.count > 0) return preferredScope;
  }

  const transaction = database.transaction(META_STORE, 'readonly');
  const libraries = await requestToPromise(
    transaction.objectStore(META_STORE).getAll()
  );
  const latest = libraries
    .filter((library) => library.count > 0)
    .sort((first, second) =>
      second.downloadedAt.localeCompare(first.downloadedAt)
    )[0];

  if (latest) {
    localStorage.setItem(LAST_OFFLINE_SCOPE_KEY, latest.scope);
    return latest.scope;
  }
  return null;
};

export const queueSongUpdate = async (scope, song, payload) => {
  const database = await openDatabase();
  const cacheKey = songCacheKey(scope, song.id);
  const readTransaction = database.transaction(QUEUE_STORE, 'readonly');
  const previous = await requestToPromise(
    readTransaction.objectStore(QUEUE_STORE).get(cacheKey)
  );
  const transaction = database.transaction(
    [SONG_STORE, QUEUE_STORE],
    'readwrite'
  );
  const queueStore = transaction.objectStore(QUEUE_STORE);
  const now = new Date().toISOString();

  transaction.objectStore(SONG_STORE).put({
    cacheKey,
    scope,
    songId: song.id,
    song,
    updatedAt: now,
  });
  queueStore.put({
    cacheKey,
    scope,
    songId: song.id,
    payload: { ...(previous?.payload || {}), ...payload },
    updatedAt: now,
  });

  await transactionDone(transaction);
};

export const getPendingUpdates = async (scope) => {
  const database = await openDatabase();
  const transaction = database.transaction(QUEUE_STORE, 'readonly');
  const records = await requestToPromise(
    transaction.objectStore(QUEUE_STORE).getAll()
  );
  return records.filter((record) => record.scope === scope);
};

export const markSongSynced = async (scope, song) => {
  const database = await openDatabase();
  const cacheKey = songCacheKey(scope, song.id);
  const transaction = database.transaction(
    [SONG_STORE, QUEUE_STORE],
    'readwrite'
  );
  transaction.objectStore(SONG_STORE).put({
    cacheKey,
    scope,
    songId: song.id,
    song,
    updatedAt: new Date().toISOString(),
  });
  transaction.objectStore(QUEUE_STORE).delete(cacheKey);
  await transactionDone(transaction);
};
