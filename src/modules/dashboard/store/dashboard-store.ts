import { create } from "zustand";
import { widgetRepository, settingsRepository, tabRepository, type TabRecord } from "@/lib/db";
import {
  WidgetRecord,
  WidgetType,
  SurfaceStyle,
  widgetCatalog,
  GRID_SETTINGS,
  GridSize,
  GridPosition,
} from "@/modules/dashboard/types";
import { rectanglesOverlap, type Rect } from "../utils/collision-utils";

interface DashboardState {
  widgets: WidgetRecord[];
  tabs: TabRecord[];
  loading: boolean;
  initialized: boolean;
  surfaceStyle: SurfaceStyle;
  currentTabId: number | null;
  hydrate: () => Promise<void>;
  addWidgets: (types: WidgetType[]) => Promise<void>;
  updateWidgetLayout: (
    id: number,
    updates: Pick<WidgetRecord, "position" | "size">,
    options?: { persist?: boolean }
  ) => void;
  removeWidget: (id: number) => Promise<void>;
  duplicateWidget: (id: number) => Promise<void>;
  setSurfaceStyle: (style: SurfaceStyle) => Promise<void>;
  setCurrentTabId: (tabId: number) => Promise<void>;
  createTab: (name?: string) => Promise<TabRecord | null>;
  updateTab: (id: number, updates: Partial<TabRecord>) => Promise<void>;
  removeTab: (id: number) => Promise<void>;
  getPageWidgets: (pageId: number) => WidgetRecord[];
  getAvailableTabs: () => TabRecord[];
}

const defaultSurface: SurfaceStyle = "default";

/**
 * Finds the next available slot for a widget of the given size
 * @param existing - Array of existing widget rectangles
 * @param size - Size of the widget to place
 * @returns Position for the widget (always finds a slot, unlimited space)
 */
const findNextSlot = (existing: Rect[], size: GridSize): GridPosition => {
  const maxColumns = GRID_SETTINGS.columns;
  // Calculate search depth based on existing widgets, with some padding
  const searchDepth = existing.reduce((acc, widget) => Math.max(acc, widget.position.y + widget.size.h), 0) + 50;

  for (let y = 0; y <= searchDepth; y++) {
    for (let x = 0; x <= maxColumns - size.w; x++) {
      const candidate: Rect = { position: { x, y }, size };
      const hasCollision = existing.some((rect) =>
        rectanglesOverlap(candidate, rect)
      );
      if (!hasCollision) {
        return { x, y };
      }
    }
  }
  
  // If no slot found in search depth, place at the bottom
  return { x: 0, y: searchDepth + 1 };
};

const normalizeWidgets = (widgets: WidgetRecord[]): WidgetRecord[] => {
  // Group widgets by pageId to normalize separately
  const widgetsByPage = new Map<number, WidgetRecord[]>();
  widgets.forEach((widget) => {
    const pageId = widget.pageId ?? 1;
    if (!widgetsByPage.has(pageId)) {
      widgetsByPage.set(pageId, []);
    }
    widgetsByPage.get(pageId)!.push(widget);
  });

  const normalized: WidgetRecord[] = [];

  widgetsByPage.forEach((pageWidgets) => {
    const clones = pageWidgets.map((widget) => ({
      ...widget,
      position: { ...widget.position },
      size: { ...widget.size },
      minSize: { ...widget.minSize },
    }));

    const sorted = [...clones].sort(
      (a, b) =>
        a.position.y - b.position.y || a.position.x - b.position.x || a.id - b.id
    );

    const placed: WidgetRecord[] = [];

    for (const widget of sorted) {
      let nextY = Math.max(0, widget.position.y);
      let attempts = 0;
      const maxAttempts = 1000; // Prevent infinite loops
      
      while (
        attempts < maxAttempts &&
        placed.some((other) =>
          rectanglesOverlap(
            { position: { ...widget.position, y: nextY }, size: widget.size },
            other
          )
        )
      ) {
        const blockers = placed.filter((other) =>
          rectanglesOverlap(
            { position: { ...widget.position, y: nextY }, size: widget.size },
            other
          )
        );
        if (blockers.length === 0) break;
        
        const pushY = Math.max(
          ...blockers.map((other) => other.position.y + other.size.h)
        );
        nextY = pushY;
        attempts++;
      }
      
      widget.position = { ...widget.position, y: nextY };
      placed.push(widget);
    }

    normalized.push(...placed);
  });

  // Return widgets in original order, but with normalized positions
  const placementMap = new Map<number, WidgetRecord>(
    normalized.map((widget) => [widget.id, widget])
  );

  return widgets.map((widget) => placementMap.get(widget.id) ?? widget);
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  widgets: [],
  tabs: [],
  loading: true,
  initialized: false,
  surfaceStyle: defaultSurface,
  currentTabId: null,
  hydrate: async () => {
    if (get().initialized) return;
    set({ loading: true });
    try {
      const [widgets, persistedSurface, persistedTabId] = await Promise.all([
        widgetRepository.list(),
        settingsRepository.get<SurfaceStyle>("surface-style"),
        settingsRepository.get<number>("current-tab-id"),
      ]);
      
      // Load tabs (only productivity context)
      let tabs = await tabRepository.list("productivity");
      
      // If no tabs exist, create a default one
      // All existing widgets will be migrated to use this tab
      if (tabs.length === 0) {
        const defaultTab = await tabRepository.create({
          name: "Tab 1",
          order: 1,
          context: "productivity",
        });
        if (defaultTab) {
          tabs = [defaultTab];
          
          // Migrate all widgets to use the default tab
          // Update widgets that don't have a matching tab
          const widgetPageIds = new Set(widgets.map(w => w.pageId ?? 1));
          for (const widget of widgets) {
            const widgetPageId = widget.pageId ?? 1;
            // If widget's pageId doesn't match any tab, update it to default tab
            if (widgetPageId !== defaultTab.id) {
              await widgetRepository.update(widget.id, { pageId: defaultTab.id });
            }
          }
        }
      }
      
      // Set current tab - use persisted tab or first tab
      const currentTabId = persistedTabId ?? tabs[0]?.id ?? null;
      
      set({
        widgets: normalizeWidgets(widgets),
        tabs,
        loading: false,
        initialized: true,
        surfaceStyle: persistedSurface ?? defaultSurface,
        currentTabId,
      });
    } catch (error) {
      console.error("Failed to hydrate dashboard:", error);
      set({
        widgets: [],
        tabs: [],
        loading: false,
        initialized: true,
        surfaceStyle: defaultSurface,
        currentTabId: null,
      });
    }
  },
  addWidgets: async (types: WidgetType[]) => {
    if (!types.length) return;
    let state = get();
    let currentTabId = state.currentTabId;
    if (!currentTabId) {
      // If no current tab, use first tab or create one
      if (state.tabs.length > 0) {
        currentTabId = state.tabs[0].id;
        await get().setCurrentTabId(currentTabId);
      } else {
        const newTab = await get().createTab();
        if (!newTab) return;
        currentTabId = newTab.id;
      }
    }
    let pageWidgets = state.widgets.filter((w) => w.pageId === currentTabId);
    const payloads: Array<
      Omit<WidgetRecord, "id" | "createdAt" | "updatedAt">
    > = [];

    // Track widgets being added in this batch to prevent overlaps
    const batchShadow: WidgetRecord[] = [];
    
    for (const type of types) {
      const definition = widgetCatalog[type];
      if (!definition) {
        console.warn(`Widget type "${type}" not found in catalog`);
        continue;
      }
      
      // Refresh pageWidgets from current state in case tab changed
      state = get();
      currentTabId = state.currentTabId ?? currentTabId;
      pageWidgets = state.widgets.filter((w) => w.pageId === currentTabId);
      
      // Combine existing page widgets with widgets being added in this batch
      const shadow: Rect[] = [
        ...pageWidgets.map((w) => ({ position: w.position, size: w.size })),
        ...batchShadow.map((w) => ({ position: w.position, size: w.size })),
      ];
      // Always add to current tab - unlimited space
      const position = findNextSlot(shadow, definition.defaultSize);
      
      const payload = {
        type,
        title: definition.title,
        position,
        size: definition.defaultSize,
        minSize: definition.minSize,
        surface: state.surfaceStyle,
        isLocked: false,
        pageId: currentTabId, // pageId is now tab.id
      };
      payloads.push(payload);
      
      // Add to batch shadow so next widget in the batch accounts for this one
      batchShadow.push({
        ...payload,
        id: Number.MAX_SAFE_INTEGER - batchShadow.length,
        createdAt: "",
        updatedAt: "",
      });
    }

    if (payloads.length === 0) {
      console.warn("No widgets to create");
      return;
    }

    const created = await widgetRepository.bulkCreate(payloads);
    if (!created.length) {
      console.error("Failed to create widgets");
      return;
    }
    
    // Add created widgets to state - widgets are already placed on correct pages
    // Don't normalize immediately to prevent infinite loops - let react-grid-layout handle positioning
    set((state) => ({
      widgets: [...state.widgets, ...created],
    }));
  },
  updateWidgetLayout: (id, updates, options = { persist: true }) => {
    set((state) => {
      const widget = state.widgets.find((w) => w.id === id);
      if (!widget) {
        console.warn(`Widget with id ${id} not found`);
        return state;
      }
      
      // Check if values actually changed to prevent unnecessary updates
      const positionChanged = 
        widget.position.x !== updates.position?.x ||
        widget.position.y !== updates.position?.y;
      const sizeChanged =
        widget.size.w !== updates.size?.w ||
        widget.size.h !== updates.size?.h;
      
      if (!positionChanged && !sizeChanged) {
        return state; // No changes, don't update
      }
      
      const updated = state.widgets.map((w) =>
        w.id === id
          ? {
              ...w,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : w
      );
      // Only normalize if we're not in a drag/resize operation (when persist is false)
      // This prevents infinite loops during drag/resize
      if (options.persist) {
        return {
          widgets: normalizeWidgets(updated),
        };
      }
      return {
        widgets: updated,
      };
    });
    if (options.persist) {
      const snapshot = get().widgets;
      const widget = snapshot.find((w) => w.id === id);
      if (widget) {
        void widgetRepository.update(widget.id, {
          position: widget.position,
          size: widget.size,
        }).catch((error) => {
          console.error(`Failed to persist layout update for widget ${id}:`, error);
        });
      }
    }
  },
  removeWidget: async (id: number) => {
    await widgetRepository.remove(id);
    set((state) => {
      const widgets = normalizeWidgets(
        state.widgets.filter((widget) => widget.id !== id)
      );
      return {
        widgets,
      };
    });
  },
  duplicateWidget: async (id: number) => {
    const state = get();
    const widget = state.widgets.find((w) => w.id === id);
    if (!widget) {
      console.warn(`Widget with id ${id} not found`);
      return;
    }

    const pageWidgets = state.widgets.filter((w) => w.pageId === widget.pageId);
    const shadow: Rect[] = pageWidgets.map((w) => ({
      position: w.position,
      size: w.size,
    }));

    // Find next available position for the duplicate
    const position = findNextSlot(shadow, widget.size);

    const payload: Omit<WidgetRecord, "id" | "createdAt" | "updatedAt"> = {
      type: widget.type,
      title: widget.title,
      position,
      size: widget.size,
      minSize: widget.minSize,
      surface: widget.surface,
      isLocked: widget.isLocked,
      pageId: widget.pageId,
    };

    const created = await widgetRepository.create(payload);
    if (created) {
      set((state) => ({
        widgets: normalizeWidgets([...state.widgets, created]),
      }));
    }
  },
  setSurfaceStyle: async (style) => {
    set({ surfaceStyle: style });
    await settingsRepository.put("surface-style", style);
  },
  setCurrentTabId: async (tabId: number) => {
    set({ currentTabId: tabId });
    await settingsRepository.put("current-tab-id", tabId);
  },
  createTab: async (name?: string) => {
    const tabs = get().tabs;
    const maxOrder = tabs.length > 0 ? Math.max(...tabs.map(t => t.order ?? 0)) : 0;
    const tabName = name || `Tab ${tabs.length + 1}`;
    const newTab = await tabRepository.create({
      name: tabName,
      order: maxOrder + 1,
      context: "productivity",
    });
    if (newTab) {
      set((state) => ({ tabs: [...state.tabs, newTab] }));
      await get().setCurrentTabId(newTab.id);
    }
    return newTab;
  },
  updateTab: async (id: number, updates: Partial<TabRecord>) => {
    const updated = await tabRepository.update(id, updates);
    if (updated) {
      set((state) => ({
        tabs: state.tabs.map(t => t.id === id ? updated : t),
      }));
    }
  },
  removeTab: async (id: number) => {
    const tabs = get().tabs;
    if (tabs.length <= 1) {
      // Don't allow removing the last tab
      return;
    }
    await tabRepository.remove(id);
    const remainingTabs = tabs.filter(t => t.id !== id);
    set({ tabs: remainingTabs });
    
    // If we removed the current tab, switch to the first remaining tab
    if (get().currentTabId === id) {
      if (remainingTabs.length > 0) {
        await get().setCurrentTabId(remainingTabs[0].id);
      }
    }
  },
  getPageWidgets: (pageId: number) => {
    return get().widgets.filter((w) => w.pageId === pageId);
  },
  getAvailableTabs: () => {
    return get().tabs;
  },
}));

