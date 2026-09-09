import type { CourseRecord, CourseSession } from "./types";

const DATABASE_NAME = "coursecraft";
const DATABASE_VERSION = 1;

type StoreName = "courses" | "sessions";

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let blocked = false;

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("courses")) {
        database.createObjectStore("courses", { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains("sessions")) {
        database.createObjectStore("sessions", { keyPath: "id" });
      }
    };

    request.onblocked = () => {
      blocked = true;
      reject(
        new Error(
          "Local storage is blocked by another tab. Close other Coursecraft tabs and retry.",
        ),
      );
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Unable to open local storage."));
    };

    request.onsuccess = () => {
      const database = request.result;

      if (blocked) {
        database.close();
        return;
      }

      database.onversionchange = () => {
        database.close();
        databasePromise = undefined;
      };

      resolve(database);
    };
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw error;
  });

  return databasePromise;
}

async function execute<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));

    let result: T;

    request.onsuccess = () => {
      result = request.result;
    };

    transaction.oncomplete = () => resolve(result);

    transaction.onerror = () => {
      reject(
        transaction.error ??
          request.error ??
          new Error("Local storage transaction failed."),
      );
    };

    transaction.onabort = () => {
      reject(
        transaction.error ?? new Error("Local storage transaction was aborted."),
      );
    };
  });
}

export const storage = {
  async history(): Promise<CourseRecord[]> {
    const records = await execute<CourseRecord[]>(
      "courses",
      "readonly",
      (store) => store.getAll(),
    );

    return records.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  },

  async saveCourse(record: CourseRecord): Promise<void> {
    await execute("courses", "readwrite", (store) => store.put(record));
  },

  async getSession(id: string): Promise<CourseSession | undefined> {
    return execute<CourseSession | undefined>(
      "sessions",
      "readonly",
      (store) => store.get(id),
    );
  },

  async saveSession(session: CourseSession): Promise<void> {
    await execute("sessions", "readwrite", (store) => store.put(session));
  },

  async removeCourse(id: string): Promise<void> {
    const database = await openDatabase();

    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        ["courses", "sessions"],
        "readwrite",
      );

      transaction.objectStore("courses").delete(id);
      transaction.objectStore("sessions").delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Unable to remove history."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("History deletion was aborted."));
    });
  },
};