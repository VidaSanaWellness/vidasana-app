import store from 'expo-sqlite/kv-store';

type StorageKey = 'LANGUAGE' | 'STORE';

export const storage = {
  removeItem: (key: StorageKey) => store.removeItemSync(key),
  getItem: (key: StorageKey) => JSON.parse(store.getItemSync(key) || 'null'),
  setItem: (key: StorageKey, value: any) => store.setItemSync(key, JSON.stringify(value)),
};
