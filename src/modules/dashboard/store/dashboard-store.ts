import { create } from "zustand";
import { widgetRepository, settingsRepository } from "@/lib/db";
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
  loading: boolean;
  initialized: boolean;
  surfaceStyle: SurfaceStyle;
  currentPage: number;
  maxRows: number; // Store maxRows for widget placement
  hydrate: () => Promise<void>;
  addWidgets: (types: WidgetType[], maxRows?: number) => Promise<void>;
  updateWidgetLayout: (
    id: number,
    updates: Pick<WidgetRecord, "position" | "size">,
    options?: { persist?: boolean }
  ) => void;
  removeWidget: (id: number) => Promise<void>;
  setSurfaceStyle: (style: SurfaceStyle) => Promise<void>;
  setCurrentPage: (page: number) => void;
  setMaxRows: (maxRows: number) => void;
  getPageWidgets: (pageId: number) => WidgetRecord[];
  getAvailablePages: () => number[];
}

const defaultSurface: SurfaceStyle = "default";

/**
 * Finds the next available slot for a widget of the given size
 * @param existing - Array of existing widget rectangles
 * @param size - Size of the widget to place
 * @param maxRows - Optional maximum number of rows to search
 * @returns Position for the widget or null if no space available
 */
const findNextSlot = (existing: Rect[], size: GridSize, maxRows?: number): GridPosition | null => {
  const maxColumns = GRID_SETTINGS.columns;
  const maxY = maxRows !== undefined ? maxRows - size.h : undefined;
  const searchDepth = maxY !== undefined
    ? Math.min(maxY, existing.reduce((acc, widget) => Math.max(acc, widget.position.y + widget.size.h), 0) + 10)
    : existing.reduce((acc, widget) => Math.max(acc, widget.position.y + widget.size.h), 0) + 50;

  for (let y = 0; y <= searchDepth; y++) {
    // Check if this row would exceed maxRows
    if (maxY !== undefined && y > maxY) {
      return null; // No space on this page
    }
    
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

  // If maxRows is set and we couldn't find a slot, return null
  if (maxRows !== undefined) {
    return null;
  }
  
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
  loading: true,
  initialized: false,
  surfaceStyle: defaultSurface,
  currentPage: 1,
  maxRows: 10, // Default maxRows
  hydrate: async () => {
    if (get().initialized) return;
    set({ loading: true });
    try {
      const [widgets, persistedSurface, persistedPage] = await Promise.all([
        widgetRepository.list(),
        settingsRepository.get<SurfaceStyle>("surface-style"),
        settingsRepository.get<number>("current-page"),
      ]);
      set({
        widgets: normalizeWidgets(widgets),
        loading: false,
        initialized: true,
        surfaceStyle: persistedSurface ?? defaultSurface,
        currentPage: persistedPage ?? 1,
      });
    } catch (error) {
      console.error("Failed to hydrate dashboard:", error);
      set({
        widgets: [],
        loading: false,
        initialized: true,
        surfaceStyle: defaultSurface,
        currentPage: 1,
      });
    }
  },
  addWidgets: async (types: WidgetType[], maxRows?: number) => {
    if (!types.length) return;
    let state = get();
    let currentPage = state.currentPage;
    let pageWidgets = state.widgets.filter((w) => w.pageId === currentPage);
    const payloads: Array<
      Omit<WidgetRecord, "id" | "createdAt" | "updatedAt">
    > = [];

    // Use provided maxRows, or fall back to stored maxRows, or default to 10
    const estimatedMaxRows = maxRows ?? state.maxRows ?? 10;

    // Track widgets being added in this batch to prevent overlaps
    const batchShadow: WidgetRecord[] = [];
    
    for (const type of types) {
      const definition = widgetCatalog[type];
      if (!definition) {
        console.warn(`Widget type "${type}" not found in catalog`);
        continue;
      }
      
      // Refresh pageWidgets from current state in case page changed
      state = get();
      pageWidgets = state.widgets.filter((w) => w.pageId === currentPage);
      
      // Combine existing page widgets with widgets being added in this batch
      const shadow: Rect[] = [
        ...pageWidgets.map((w) => ({ position: w.position, size: w.size })),
        ...batchShadow.map((w) => ({ position: w.position, size: w.size })),
      ];
      let position = findNextSlot(shadow, definition.defaultSize, estimatedMaxRows);
      
      // If no space on current page, try existing pages first, then create new if needed
      if (position === null) {
        const availablePages = get().getAvailablePages();
        const maxExistingPage = availablePages.length > 0 ? Math.max(...availablePages) : currentPage;
        
        // Try existing pages starting from currentPage + 1
        let foundPage = false;
        for (let tryPage = currentPage + 1; tryPage <= maxExistingPage; tryPage++) {
          state = get();
          const tryPageWidgets = state.widgets.filter((w) => w.pageId === tryPage);
          const tryShadow: Rect[] = [
            ...tryPageWidgets.map((w) => ({ position: w.position, size: w.size })),
            ...batchShadow.map((w) => ({ position: w.position, size: w.size })),
          ];
          const tryPosition = findNextSlot(tryShadow, definition.defaultSize, estimatedMaxRows);
          
          if (tryPosition !== null && tryPosition.y + definition.defaultSize.h <= estimatedMaxRows) {
            // Found space on this existing page
            currentPage = tryPage;
            position = tryPosition;
            foundPage = true;
            break;
          }
        }
        
        // If no space on any existing page, create a new page
        if (!foundPage) {
          const nextPage = maxExistingPage + 1;
          currentPage = nextPage;
          set({ currentPage });
          await settingsRepository.put("current-page", currentPage);
          
          // Refresh state after page switch
          state = get();
          pageWidgets = state.widgets.filter((w) => w.pageId === currentPage);
          // Reset batch shadow for new page
          batchShadow.length = 0;
          const emptyShadow: Rect[] = [];
          position = findNextSlot(emptyShadow, definition.defaultSize, estimatedMaxRows) || { x: 0, y: 0 };
        } else {
          // Switch to the page we found
          set({ currentPage });
          await settingsRepository.put("current-page", currentPage);
          state = get();
          pageWidgets = state.widgets.filter((w) => w.pageId === currentPage);
        }
      }
      
      // Final check: ensure widget doesn't exceed maxRows before creating
      if (position.y + definition.defaultSize.h > estimatedMaxRows) {
        // This shouldn't happen if findNextSlot is working correctly, but handle it anyway
        const availablePages = get().getAvailablePages();
        const maxExistingPage = availablePages.length > 0 ? Math.max(...availablePages) : currentPage;
        const nextPage = maxExistingPage + 1;
        currentPage = nextPage;
        set({ currentPage });
        await settingsRepository.put("current-page", currentPage);
        state = get();
        pageWidgets = state.widgets.filter((w) => w.pageId === currentPage);
        batchShadow.length = 0;
        const emptyShadow: Rect[] = [];
        position = findNextSlot(emptyShadow, definition.defaultSize, estimatedMaxRows) || { x: 0, y: 0 };
      }
      
      const payload = {
        type,
        title: definition.title,
        position,
        size: definition.defaultSize,
        minSize: definition.minSize,
        surface: state.surfaceStyle,
        isLocked: false,
        pageId: currentPage,
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
    
    // Switch to the last page that has widgets if we created widgets on a new page
    const finalState = get();
    const finalPages = finalState.getAvailablePages();
    if (finalPages.length > 0) {
      const lastPage = Math.max(...finalPages);
      if (lastPage !== finalState.currentPage) {
        set({ currentPage: lastPage });
        await settingsRepository.put("current-page", lastPage);
      }
    }
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
  setSurfaceStyle: async (style) => {
    set({ surfaceStyle: style });
    await settingsRepository.put("surface-style", style);
  },
  setCurrentPage: async (page: number) => {
    set({ currentPage: page });
    await settingsRepository.put("current-page", page);
  },
  setMaxRows: (maxRows: number) => {
    set({ maxRows });
  },
  getPageWidgets: (pageId: number) => {
    return get().widgets.filter((w) => w.pageId === pageId);
  },
  getAvailablePages: () => {
    const pages = new Set(get().widgets.map((w) => w.pageId));
    return Array.from(pages).sort((a, b) => a - b);
  },
}));

