import { MMKV } from 'react-native-mmkv';

type StringStorage = {
  clearAll(): unknown;
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  getAllKeys?: () => string[];
};

const instances = new Map<string, StringStorage>();
const memoryStores = new Map<string, Map<string, string>>();

function createMemoryStorage(id: string): StringStorage {
  if (!memoryStores.has(id)) {
    memoryStores.set(id, new Map<string, string>());
  }
  const map = memoryStores.get(id)!;
  return {
    getString: (key) => map.get(key),
    set: (key, value) => map.set(key, value),
    delete: (key) => map.delete(key),
    clearAll: () => map.clear(),
    getAllKeys: () => [...map.keys()],
  };
}

export function getMmkvStorage(id: string): StringStorage {
  const cached = instances.get(id);
  if (cached) {
    return cached;
  }

  try {
    const storage = new MMKV({ id });
    instances.set(id, storage);
    return storage;
  } catch {
    const fallback = createMemoryStorage(id);
    instances.set(id, fallback);
    return fallback;
  }
}

/** Snapshot for Zippy MMKV panel. */
export function readMmkvSnapshot(id: string): Record<string, unknown> {
  const storage = getMmkvStorage(id);
  const keys =
    typeof storage.getAllKeys === 'function' ? storage.getAllKeys() : [];
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    out[key] = storage.getString(key) ?? null;
  }
  return out;
}
