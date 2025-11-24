import { openDB, DBSchema, IDBPDatabase } from "idb";
import {
  GridPosition,
  GridSize,
  WidgetRecord,
  WidgetType,
} from "@/modules/dashboard/types";

export interface TodoRecord {
  id: number;
  widgetId: number;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRecord {
  id: number;
  widgetId: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuickLinkRecord {
  id: number;
  widgetId: number;
  label: string;
  url: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScratchpadRecord {
  id: number;
  widgetId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

interface DashboardDB extends DBSchema {
  widgets: {
    key: number;
    value: WidgetRecord;
    indexes: { type: WidgetType };
  };
  todos: {
    key: number;
    value: TodoRecord;
    indexes: { widgetId: number };
  };
  notes: {
    key: number;
    value: NoteRecord;
    indexes: { widgetId: number };
  };
  quicklinks: {
    key: number;
    value: QuickLinkRecord;
    indexes: { widgetId: number };
  };
  scratchpads: {
    key: number;
    value: ScratchpadRecord;
    indexes: { widgetId: number };
  };
  settings: {
    key: string;
    value: SettingRecord;
  };
}

const DB_NAME = "personalised-dashboard";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<DashboardDB>> | null = null;

const isBrowser = typeof window !== "undefined";

const ensureDb = async () => {
  if (!isBrowser) {
    throw new Error("IndexedDB is only available in the browser");
  }

  if (!dbPromise) {
    dbPromise = openDB<DashboardDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("widgets")) {
          const widgetsStore = db.createObjectStore("widgets", {
            keyPath: "id",
            autoIncrement: true,
          });
          widgetsStore.createIndex("type", "type", { unique: false });
        }

        if (!db.objectStoreNames.contains("todos")) {
          const todoStore = db.createObjectStore("todos", {
            keyPath: "id",
            autoIncrement: true,
          });
          todoStore.createIndex("widgetId", "widgetId", { unique: false });
        }

        if (!db.objectStoreNames.contains("notes")) {
          const notesStore = db.createObjectStore("notes", {
            keyPath: "id",
            autoIncrement: true,
          });
          notesStore.createIndex("widgetId", "widgetId", { unique: false });
        }

        if (!db.objectStoreNames.contains("quicklinks")) {
          const quickLinkStore = db.createObjectStore("quicklinks", {
            keyPath: "id",
            autoIncrement: true,
          });
          quickLinkStore.createIndex("widgetId", "widgetId", { unique: false });
        }

        if (!db.objectStoreNames.contains("scratchpads")) {
          const scratchpadStore = db.createObjectStore("scratchpads", {
            keyPath: "id",
            autoIncrement: true,
          });
          scratchpadStore.createIndex("widgetId", "widgetId", { unique: false });
        }

        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }

        if (oldVersion < 2) {
          const updateIndexes = (storeName: keyof DashboardDB) => {
            try {
              const store = db.transaction(storeName, "readwrite").objectStore(
                storeName
              );
              if (
                storeName !== "widgets" &&
                !store.indexNames.contains("widgetId")
              ) {
                store.createIndex("widgetId", "widgetId", { unique: false });
              }
              if (
                storeName === "widgets" &&
                !store.indexNames.contains("type")
              ) {
                store.createIndex("type", "type", { unique: false });
              }
            } catch {
              // Ignore index creation errors on fresh DBs
            }
          };

          updateIndexes("widgets");
          updateIndexes("todos");
          updateIndexes("notes");
          updateIndexes("quicklinks");
        }

        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("scratchpads")) {
            const scratchpadStore = db.createObjectStore("scratchpads", {
              keyPath: "id",
              autoIncrement: true,
            });
            scratchpadStore.createIndex("widgetId", "widgetId", { unique: false });
          }
        }
      },
    });
  }

  return dbPromise;
};

const timestamp = () => new Date().toISOString();

const withDb = async <T>(fn: (db: IDBPDatabase<DashboardDB>) => Promise<T>) => {
  if (!isBrowser) {
    return Promise.resolve(null as T);
  }
  const db = await ensureDb();
  return fn(db);
};

const safePosition = (position?: Partial<GridPosition>): GridPosition => ({
  x: Math.max(0, Math.round(position?.x ?? 0)),
  y: Math.max(0, Math.round(position?.y ?? 0)),
});

const safeSize = (size?: Partial<GridSize>, fallback: GridSize = { w: 4, h: 4 }): GridSize => ({
  w: Math.max(1, Math.round(size?.w ?? fallback.w)),
  h: Math.max(1, Math.round(size?.h ?? fallback.h)),
});

export const widgetRepository = {
  async list(): Promise<WidgetRecord[]> {
    if (!isBrowser) return [];
    return withDb((db) => db.getAll("widgets")).then((records) =>
      (records ?? []).map((record) => ({
        ...record,
        pageId: record.pageId ?? 1, // Default to page 1 for existing records
        position: safePosition(record.position),
        size: safeSize(record.size, record.minSize ?? { w: 3, h: 3 }),
        minSize: safeSize(record.minSize ?? record.size),
      }))
    );
  },
  async create(
    payload: Omit<WidgetRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<WidgetRecord | null> {
    if (!isBrowser) return null;
    const now = timestamp();
    const record: Omit<WidgetRecord, "id"> = {
      ...payload,
      pageId: payload.pageId ?? 1, // Default to page 1
      position: safePosition(payload.position),
      size: safeSize(payload.size, payload.minSize),
      minSize: safeSize(payload.minSize),
      createdAt: now,
      updatedAt: now,
    };

    const id = await withDb((db) => db.add("widgets", record));
    if (!id) return null;
    return { ...(record as WidgetRecord), id: Number(id) };
  },
  async bulkCreate(
    payloads: Array<Omit<WidgetRecord, "id" | "createdAt" | "updatedAt">>
  ): Promise<WidgetRecord[]> {
    if (!isBrowser) return [];
    const created: WidgetRecord[] = [];
    for (const payload of payloads) {
      const record = await this.create(payload);
      if (record) created.push(record);
    }
    return created;
  },
  async update(id: number, updates: Partial<WidgetRecord>) {
    if (!isBrowser) return null;
    const existing = await withDb((db) => db.get("widgets", id));
    if (!existing) return null;
    const updated: WidgetRecord = {
      ...existing,
      ...updates,
      position: updates.position
        ? safePosition(updates.position)
        : existing.position,
      size: updates.size ? safeSize(updates.size, existing.minSize) : existing.size,
      minSize: updates.minSize
        ? safeSize(updates.minSize)
        : existing.minSize,
      updatedAt: timestamp(),
    };
    await withDb((db) => db.put("widgets", updated));
    return updated;
  },
  async remove(id: number) {
    if (!isBrowser) return;
    await withDb((db) => db.delete("widgets", id));
    // Cascade deletes
    await Promise.all([
      todoRepository.removeByWidget(id),
      noteRepository.removeByWidget(id),
      quickLinkRepository.removeByWidget(id),
      scratchpadRepository.removeByWidget(id),
    ]);
  },
};

const buildCrud = <T extends { id: number; widgetId: number }>(
  storeName: "todos" | "notes" | "quicklinks" | "scratchpads"
) => {
  const api = {
    async list(widgetId: number) {
      if (!isBrowser) return [] as T[];
      return withDb(async (db) => {
        const index = db
          .transaction(storeName, "readonly")
          .store.index("widgetId");
        return index.getAll(widgetId);
      });
    },
    async create(payload: Omit<T, "id" | "createdAt" | "updatedAt">) {
      if (!isBrowser) return null;
      const now = timestamp();
      const record = { ...payload, createdAt: now, updatedAt: now };
      const id = await withDb((db) => db.add(storeName, record));
      return { ...(record as T), id: Number(id) };
    },
    async update(id: number, updates: Partial<T>) {
      if (!isBrowser) return null;
      const existing = await withDb((db) => db.get(storeName, id));
      if (!existing) return null;
      const updated = {
        ...existing,
        ...updates,
        updatedAt: timestamp(),
      };
      await withDb((db) => db.put(storeName, updated));
      return updated as T;
    },
    async remove(id: number) {
      if (!isBrowser) return;
      await withDb((db) => db.delete(storeName, id));
    },
    async removeByWidget(widgetId: number) {
      if (!isBrowser) return;
      const records = await api.list(widgetId);
      await Promise.all(
        records.map((record) => withDb((db) => db.delete(storeName, record.id)))
      );
    },
  };
  return api;
};

export const todoRepository = buildCrud<TodoRecord>("todos");
export const noteRepository = buildCrud<NoteRecord>("notes");
export const quickLinkRepository = buildCrud<QuickLinkRecord>("quicklinks");
export const scratchpadRepository = buildCrud<ScratchpadRecord>("scratchpads");

export const settingsRepository = {
  async get<T>(key: string): Promise<T | null> {
    if (!isBrowser) return null;
    const record = await withDb((db) => db.get("settings", key));
    return (record?.value as T) ?? null;
  },
  async put<T>(key: string, value: T) {
    if (!isBrowser) return;
    await withDb((db) =>
      db.put("settings", {
        key,
        value,
        updatedAt: timestamp(),
      })
    );
  },
};