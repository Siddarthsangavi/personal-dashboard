"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { TabsList } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useDashboardStore } from "../store/dashboard-store";
import { useDataLibraryTabsStore } from "@/modules/data-library/store/data-library-tabs-store";
import { cn } from "@/lib/utils";
import { type TabRecord } from "@/lib/db";

interface ChromeTabsProps {
  context?: "productivity" | "data-library";
}

export function ChromeTabs({ context = "productivity" }: ChromeTabsProps) {
  // Use the appropriate store based on context
  const productivityStore = useDashboardStore();
  const dataLibraryStore = useDataLibraryTabsStore();
  
  const store = context === "productivity" ? productivityStore : dataLibraryStore;
  
  const currentTabId = store.currentTabId;
  const tabs = store.tabs;
  const setCurrentTabId = store.setCurrentTabId;
  const createTab = store.createTab;
  const updateTab = store.updateTab;
  const removeTab = store.removeTab;
  
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartEdit = (tabId: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setEditingTabId(tabId);
      setEditValue(tab.name);
      setContextMenu(null);
    }
  };

  const handleSaveEdit = async () => {
    if (editingTabId && editValue.trim()) {
      await updateTab(editingTabId, { name: editValue.trim() });
      setEditingTabId(null);
      setEditValue("");
    }
  };

  const handleCancelEdit = () => {
    setEditingTabId(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleCreateTab = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await createTab();
  };

  const handleRemoveTab = async (tabId: number) => {
    if (tabs.length <= 1) return;
    await removeTab(tabId);
    setContextMenu(null);
  };

  const handleTabClick = (tabId: number) => {
    void setCurrentTabId(tabId);
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  if (tabs.length === 0) {
    return <div className="flex-1 border-b border-border" />;
  }

  return (
    <div className="flex items-center gap-2 relative overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <TabsList className="w-fit flex-shrink-0">
        {tabs.map((tab) => {
          const isActive = tab.id === currentTabId;
          const isEditing = editingTabId === tab.id;
          
          return (
            <button
              key={tab.id}
              type="button"
              data-state={isActive ? "active" : "inactive"}
              onClick={() => handleTabClick(tab.id)}
              onDoubleClick={() => handleStartEdit(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              className={cn(
                "inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow,background,border-color] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50",
                isActive 
                  ? "bg-background dark:text-foreground border border-input dark:border-input text-foreground shadow-sm"
                  : "bg-background/50 text-muted-foreground border border-border/30 hover:bg-background/70 hover:text-foreground",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring",
                "relative w-[120px] min-w-[120px] max-w-[120px] flex-shrink-0"
              )}
            >
              {isEditing ? (
                <Input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  className="h-6 text-xs font-medium px-1.5 py-0.5 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 w-full"
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <span className="truncate w-full text-center">{tab.name}</span>
              )}
            </button>
          );
        })}
      </TabsList>
      
      <button
        onClick={handleCreateTab}
        className="inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        title="New tab"
      >
        <Plus className="size-4" />
      </button>

      {/* Context Menu */}
      {contextMenu && typeof window !== "undefined" && document.body && createPortal(
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] w-48 rounded-xl border border-border/70 bg-card p-2 shadow-2xl"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleStartEdit(contextMenu.tabId);
            }}
          >
            <Edit2 className="size-4" />
            Rename
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              void handleRemoveTab(contextMenu.tabId);
            }}
          >
            <Trash2 className="size-4" />
            Delete Tab
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
