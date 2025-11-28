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

export interface TabRecord {
  id: number;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DataLibraryCategoryRecord {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type DataLibraryItemType = "text" | "credential" | "url" | "database" | "api-key" | "other";

export interface DataLibraryItemRecord {
  id: number;
  categoryId: number;
  name: string;
  value: string;
  tags: string[];
  type?: DataLibraryItemType; // Optional for backward compatibility
  isSensitive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Notion-like data library types
export type BlockType = "paragraph" | "heading1" | "heading2" | "heading3" | "bulleted-list" | "numbered-list" | "to-do" | "toggle" | "quote" | "divider" | "credential";

export interface PageRecord {
  id: number;
  title: string;
  content?: string; // Store the entire page content as plain text (optional for backward compatibility)
  parentId: number | null; // For nested pages
  icon?: string;
  order?: number; // For ordering pages within the same parent (optional for backward compatibility)
  createdAt: string;
  updatedAt: string;
}

export interface NotionBlockRecord {
  id: number;
  pageId: number;
  type: BlockType;
  content: string;
  order: number; // For ordering blocks
  parentId: number | null; // For nested blocks (e.g., toggle children)
  properties?: Record<string, unknown>; // For additional properties (e.g., checked for to-do)
  createdAt: string;
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
  dataLibraryCategories: {
    key: number;
    value: DataLibraryCategoryRecord;
  };
  dataLibraryItems: {
    key: number;
    value: DataLibraryItemRecord;
    indexes: { categoryId: number };
  };
  notionPages: {
    key: number;
    value: PageRecord;
    indexes: { parentId: number };
  };
  notionBlocks: {
    key: number;
    value: NotionBlockRecord;
    indexes: { pageId: number; parentId: number };
  };
  tabs: {
    key: number;
    value: TabRecord;
    indexes: { order: number };
  };
}

const DB_NAME = "personalised-dashboard";
const DB_VERSION = 7;

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

        if (!db.objectStoreNames.contains("dataLibraryCategories")) {
          db.createObjectStore("dataLibraryCategories", {
            keyPath: "id",
            autoIncrement: true,
          });
        }

        if (!db.objectStoreNames.contains("dataLibraryItems")) {
          const itemsStore = db.createObjectStore("dataLibraryItems", {
            keyPath: "id",
            autoIncrement: true,
          });
          itemsStore.createIndex("categoryId", "categoryId", { unique: false });
        }

        if (oldVersion < 2) {
          type StoreName = "notes" | "widgets" | "todos" | "quicklinks" | "scratchpads" | "settings" | "dataLibraryCategories" | "dataLibraryItems" | "notionPages" | "notionBlocks" | "tabs";
          const updateIndexes = (storeName: StoreName) => {
            try {
              const tx = db.transaction(storeName, "readwrite");
              const store = tx.objectStore(storeName) as unknown as IDBObjectStore;
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

        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains("dataLibraryCategories")) {
            db.createObjectStore("dataLibraryCategories", {
              keyPath: "id",
              autoIncrement: true,
            });
          }
          if (!db.objectStoreNames.contains("dataLibraryItems")) {
            const itemsStore = db.createObjectStore("dataLibraryItems", {
              keyPath: "id",
              autoIncrement: true,
            });
            itemsStore.createIndex("categoryId", "categoryId", { unique: false });
          }
        }

        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains("notionPages")) {
            const pagesStore = db.createObjectStore("notionPages", {
              keyPath: "id",
              autoIncrement: true,
            });
            pagesStore.createIndex("parentId", "parentId", { unique: false });
          }
          if (!db.objectStoreNames.contains("notionBlocks")) {
            const blocksStore = db.createObjectStore("notionBlocks", {
              keyPath: "id",
              autoIncrement: true,
            });
            blocksStore.createIndex("pageId", "pageId", { unique: false });
            blocksStore.createIndex("parentId", "parentId", { unique: false });
          }
        }

        if (oldVersion < 6) {
          // Migration: Order field will be added lazily when pages are first accessed
          // This is handled in the list() function
        }

        if (oldVersion < 7) {
          if (!db.objectStoreNames.contains("tabs")) {
            const tabsStore = db.createObjectStore("tabs", {
              keyPath: "id",
              autoIncrement: true,
            });
            tabsStore.createIndex("order", "order", { unique: false });
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

    const id = await withDb((db) => db.add("widgets", record as unknown as WidgetRecord));
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
      type RecordUnion = TodoRecord | NoteRecord | QuickLinkRecord | ScratchpadRecord;
      const id = await withDb((db) => db.add(storeName, record as unknown as RecordUnion));
      return { ...(record as unknown as T), id: Number(id) };
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
      return updated as unknown as T;
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

// Page repositories
export const pageRepository = {
  async list(parentId: number | null = null): Promise<PageRecord[]> {
    if (!isBrowser) return [];
    return withDb(async (db) => {
      let pages: PageRecord[];
      if (parentId === null) {
        // For null parentId, get all pages and filter
        const allPages = await db.getAll("notionPages");
        pages = allPages.filter((page) => page.parentId === null);
      } else {
        const index = db.transaction("notionPages", "readonly").store.index("parentId");
        pages = await index.getAll(parentId);
      }
      
      // Lazy migration: If any page is missing order, assign it based on id
      const needsMigration = pages.some(page => page.order === undefined);
      if (needsMigration) {
        // Sort by id (creation order) and assign order values
        pages.sort((a, b) => a.id - b.id);
        const writeTransaction = db.transaction("notionPages", "readwrite");
        const writeStore = writeTransaction.objectStore("notionPages");
        
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          if (page.order === undefined) {
            await writeStore.put({ ...page, order: i });
            pages[i] = { ...page, order: i };
          }
        }
      }
      
      // Sort by order (if available), then by id as fallback
      return pages.sort((a, b) => {
        const orderA = a.order ?? a.id;
        const orderB = b.order ?? b.id;
        return orderA - orderB;
      });
    });
  },
  async get(id: number): Promise<PageRecord | null> {
    if (!isBrowser) return null;
    return (await withDb((db) => db.get("notionPages", id))) ?? null;
  },
  async create(payload: Omit<PageRecord, "id" | "createdAt" | "updatedAt">): Promise<PageRecord | null> {
    if (!isBrowser) return null;
    const now = timestamp();
    
    // Ensure title is not empty - use default if empty
    const title = payload.title?.trim() || "Untitled";
    
    // If order is not provided, set it to the end of the list for the same parent
    let order = payload.order;
    if (order === undefined) {
      const siblings = await this.list(payload.parentId);
      order = siblings.length > 0 ? Math.max(...siblings.map(p => p.order ?? p.id)) + 1 : 0;
    }
    
    const record: Omit<PageRecord, "id"> = {
      ...payload,
      title,
      order,
      createdAt: now,
      updatedAt: now,
    };
    const id = await withDb((db) => db.add("notionPages", record as unknown as PageRecord));
    if (!id) return null;
    return { ...(record as PageRecord), id: Number(id) };
  },
  async update(id: number, updates: Partial<PageRecord>): Promise<PageRecord | null> {
    if (!isBrowser) return null;
    const existing = await withDb((db) => db.get("notionPages", id));
    if (!existing) return null;
    
    // Ensure title is not empty if it's being updated
    const finalUpdates = { ...updates };
    if (finalUpdates.title !== undefined) {
      finalUpdates.title = finalUpdates.title.trim() || "Untitled";
    }
    
    const updated: PageRecord = {
      ...existing,
      ...finalUpdates,
      updatedAt: timestamp(),
    };
    await withDb((db) => db.put("notionPages", updated));
    return updated;
  },
  async remove(id: number): Promise<void> {
    if (!isBrowser) return;
    // Cascade delete: remove all blocks and child pages
    const blocks = await notionBlockRepository.listByPage(id);
    await Promise.all(blocks.map((block) => notionBlockRepository.remove(block.id)));
    const children = await this.list(id);
    await Promise.all(children.map((child) => this.remove(child.id)));
    await withDb((db) => db.delete("notionPages", id));
  },
};

export const notionBlockRepository = {
  async listByPage(pageId: number, parentId: number | null = null): Promise<NotionBlockRecord[]> {
    if (!isBrowser) return [];
    return withDb(async (db) => {
      const pageIndex = db.transaction("notionBlocks", "readonly").store.index("pageId");
      const allBlocks = await pageIndex.getAll(pageId);
      const filtered = allBlocks.filter((block) => block.parentId === parentId);
      return filtered.sort((a, b) => a.order - b.order);
    });
  },
  async get(id: number): Promise<NotionBlockRecord | null> {
    if (!isBrowser) return null;
    return (await withDb((db) => db.get("notionBlocks", id))) ?? null;
  },
  async create(payload: Omit<NotionBlockRecord, "id" | "createdAt" | "updatedAt">): Promise<NotionBlockRecord | null> {
    if (!isBrowser) return null;
    const now = timestamp();
    const record: Omit<NotionBlockRecord, "id"> = {
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    const id = await withDb((db) => db.add("notionBlocks", record as unknown as NotionBlockRecord));
    if (!id) return null;
    return { ...(record as NotionBlockRecord), id: Number(id) };
  },
  async update(id: number, updates: Partial<NotionBlockRecord>): Promise<NotionBlockRecord | null> {
    if (!isBrowser) return null;
    const existing = await withDb((db) => db.get("notionBlocks", id));
    if (!existing) return null;
    const updated: NotionBlockRecord = {
      ...existing,
      ...updates,
      updatedAt: timestamp(),
    };
    await withDb((db) => db.put("notionBlocks", updated));
    return updated;
  },
  async remove(id: number): Promise<void> {
    if (!isBrowser) return;
    // Cascade delete: remove all child blocks
    await withDb(async (db) => {
      const allBlocks = await db.getAll("notionBlocks");
      const children = allBlocks.filter((block) => block.parentId === id);
      await Promise.all(children.map((child) => this.remove(child.id)));
    });
    await withDb((db) => db.delete("notionBlocks", id));
  },
  async reorder(pageId: number, blockIds: number[]): Promise<void> {
    if (!isBrowser) return;
    await withDb(async (db) => {
      const tx = db.transaction("notionBlocks", "readwrite");
      for (let i = 0; i < blockIds.length; i++) {
        const block = await tx.store.get(blockIds[i]);
        if (block && block.pageId === pageId) {
          await tx.store.put({ ...block, order: i, updatedAt: timestamp() });
        }
      }
      await tx.done;
    });
  },
};

export const dataLibraryCategoryRepository = {
  async list(): Promise<DataLibraryCategoryRecord[]> {
    if (!isBrowser) return [];
    return withDb((db) => db.getAll("dataLibraryCategories"));
  },
  async create(payload: Omit<DataLibraryCategoryRecord, "id" | "createdAt" | "updatedAt">) {
    if (!isBrowser) return null;
    const now = timestamp();
    const record = { ...payload, createdAt: now, updatedAt: now };
    const id = await withDb((db) => db.add("dataLibraryCategories", record as unknown as DataLibraryCategoryRecord));
    return { ...(record as DataLibraryCategoryRecord), id: Number(id) };
  },
  async update(id: number, updates: Partial<DataLibraryCategoryRecord>) {
    if (!isBrowser) return null;
    const existing = await withDb((db) => db.get("dataLibraryCategories", id));
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: timestamp(),
    };
    await withDb((db) => db.put("dataLibraryCategories", updated));
    return updated;
  },
  async remove(id: number) {
    if (!isBrowser) return;
    await withDb((db) => db.delete("dataLibraryCategories", id));
    // Cascade delete items
    const items = await dataLibraryItemRepository.listByCategory(id);
    await Promise.all(items.map((item) => dataLibraryItemRepository.remove(item.id)));
  },
};

export const dataLibraryItemRepository = {
  async listByCategory(categoryId: number): Promise<DataLibraryItemRecord[]> {
    if (!isBrowser) return [];
    return withDb(async (db) => {
      const index = db
        .transaction("dataLibraryItems", "readonly")
        .store.index("categoryId");
      return index.getAll(categoryId);
    });
  },
  async list(): Promise<DataLibraryItemRecord[]> {
    if (!isBrowser) return [];
    return withDb((db) => db.getAll("dataLibraryItems"));
  },
  async create(payload: Omit<DataLibraryItemRecord, "id" | "createdAt" | "updatedAt">) {
    if (!isBrowser) return null;
    const now = timestamp();
    const record = { ...payload, createdAt: now, updatedAt: now };
    const id = await withDb((db) => db.add("dataLibraryItems", record as unknown as DataLibraryItemRecord));
    return { ...(record as DataLibraryItemRecord), id: Number(id) };
  },
  async update(id: number, updates: Partial<DataLibraryItemRecord>) {
    if (!isBrowser) return null;
    const existing = await withDb((db) => db.get("dataLibraryItems", id));
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: timestamp(),
    };
    await withDb((db) => db.put("dataLibraryItems", updated));
    return updated;
  },
  async remove(id: number) {
    if (!isBrowser) return;
    await withDb((db) => db.delete("dataLibraryItems", id));
  },
};

export const tabRepository = {
  async list(): Promise<TabRecord[]> {
    if (!isBrowser) return [];
    return withDb(async (db) => {
      const allTabs = await db.getAll("tabs");
      // Sort by order
      return allTabs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
  },
  async create(payload: Omit<TabRecord, "id" | "createdAt" | "updatedAt">): Promise<TabRecord | null> {
    if (!isBrowser) return null;
    const now = timestamp();
    const allTabs = await this.list();
    const maxOrder = allTabs.length > 0 ? Math.max(...allTabs.map(t => t.order ?? 0)) : 0;
    const record: Omit<TabRecord, "id"> = {
      ...payload,
      order: payload.order ?? maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
    const id = await withDb((db) => db.add("tabs", record as unknown as TabRecord));
    if (!id) return null;
    return { ...(record as TabRecord), id: Number(id) };
  },
  async update(id: number, updates: Partial<TabRecord>): Promise<TabRecord | null> {
    if (!isBrowser) return null;
    const existing = await withDb((db) => db.get("tabs", id));
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: timestamp(),
    };
    await withDb((db) => db.put("tabs", updated));
    return updated;
  },
  async remove(id: number): Promise<void> {
    if (!isBrowser) return;
    await withDb((db) => db.delete("tabs", id));
  },
  async get(id: number): Promise<TabRecord | null> {
    if (!isBrowser) return null;
    return (await withDb((db) => db.get("tabs", id))) ?? null;
  },
};