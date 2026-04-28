export type StoragePrimitive = string | number | boolean | null;
export type StorageValue =
  | StoragePrimitive
  | StorageValue[]
  | { [key: string]: StorageValue };

function readRuntimeError(): Error | null {
  const error = chrome.runtime.lastError;
  return error?.message ? new Error(error.message) : null;
}

export const extensionStorage = {
  get<T>(key: string, fallback: T): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (items) => {
        const error = readRuntimeError();

        if (error) {
          reject(error);
          return;
        }

        resolve(items[key] === undefined ? fallback : (items[key] as T));
      });
    });
  },

  set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        const error = readRuntimeError();

        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  },

  remove(key: string | string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(key, () => {
        const error = readRuntimeError();

        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  },

  clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        const error = readRuntimeError();

        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
};
