import { create } from "zustand";
import { tabRepository, type TabRecord } from "@/lib/db";
import { settingsRepository } from "@/lib/db";

interface DataLibraryTabsState {
  tabs: TabRecord[];
  loading: boolean;
  initialized: boolean;
  currentTabId: number | null;
  hydrate: () => Promise<void>;
  setCurrentTabId: (tabId: number) => Promise<void>;
  createTab: (name?: string) => Promise<TabRecord | null>;
  updateTab: (id: number, updates: Partial<TabRecord>) => Promise<void>;
  removeTab: (id: number) => Promise<void>;
  getAvailableTabs: () => TabRecord[];
}

export const useDataLibraryTabsStore = create<DataLibraryTabsState>((set, get) => ({
  tabs: [],
  loading: true,
  initialized: false,
  currentTabId: null,
  hydrate: async () => {
    const tabs = await tabRepository.list("data-library");
    const persistedTabId = await settingsRepository.get<number>("data-library-current-tab-id");
    
    // Ensure at least one tab exists
    let finalTabs = tabs;
    if (tabs.length === 0) {
      const defaultTab = await tabRepository.create({
        name: "Tab 1",
        order: 1,
        context: "data-library",
      });
      if (defaultTab) {
        finalTabs = [defaultTab];
      }
    }
    
    // Ensure currentTabId is set to the first tab if none is persisted
    const currentTabId = persistedTabId ?? finalTabs[0]?.id ?? null;
    
    set({
      tabs: finalTabs,
      loading: false,
      initialized: true,
      currentTabId,
    });
  },
  setCurrentTabId: async (tabId: number) => {
    set({ currentTabId: tabId });
    await settingsRepository.put("data-library-current-tab-id", tabId);
  },
  createTab: async (name?: string) => {
    const tabs = get().tabs;
    const maxOrder = tabs.length > 0 ? Math.max(...tabs.map(t => t.order ?? 0)) : 0;
    const tabName = name || `Tab ${tabs.length + 1}`;
    const newTab = await tabRepository.create({
      name: tabName,
      order: maxOrder + 1,
      context: "data-library",
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
  getAvailableTabs: () => {
    return get().tabs;
  },
}));

