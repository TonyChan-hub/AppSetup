import { MMKV } from 'react-native-mmkv';

type StringStorage = {
  clearAll(): unknown;
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
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
