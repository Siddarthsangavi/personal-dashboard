"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useDashboardStore } from "../store/dashboard-store";
import { cn } from "@/lib/utils";

export function ChromeTabs() {
  const currentTabId = useDashboardStore((state) => state.currentTabId);
  const tabs = useDashboardStore((state) => state.tabs);
  const setCurrentTabId = useDashboardStore((state) => state.setCurrentTabId);
  const createTab = useDashboardStore((state) => state.createTab);
  const updateTab = useDashboardStore((state) => state.updateTab);
  const removeTab = useDashboardStore((state) => state.removeTab);
  
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  const currentTab = tabs.find(t => t.id === currentTabId);
  
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
    if (tabs.length <= 1) return; // Don't allow removing the last tab
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

  // Close context menu when clicking outside
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

  return (
    <div className="flex items-end gap-0 bg-background">
      {tabs.length === 0 ? (
        <div className="flex-1 border-b border-border" />
      ) : (
        tabs.map((tab, index) => {
          const isActive = tab.id === currentTabId;
          const isEditing = editingTabId === tab.id;
          const isFirst = index === 0;
          const isLast = index === tabs.length - 1;
          
          // Determine border radius based on position
          const getBorderRadius = () => {
            if (isFirst && isLast) {
              // Only one tab: round both top corners
              return "rounded-tl-lg rounded-tr-lg";
            } else if (isFirst) {
              // First tab (with more tabs): only round top-left, explicitly set top-right to 0
              return "rounded-tl-lg rounded-tr-[0px]";
            } else if (isLast) {
              // Last tab (but not first): only round top-right, explicitly set top-left to 0
              return "rounded-tr-lg rounded-tl-[0px]";
            }
            // Middle tabs: explicitly no rounding
            return "rounded-tl-[0px] rounded-tr-[0px]";
          };

          return (
            <div
              key={tab.id}
              className={cn(
                "relative flex items-center gap-1 px-3 py-1.5 min-w-[120px] max-w-[240px]",
                "border-t border-l border-r border-border/50",
                "bg-muted/50",
                isActive && "bg-background border-b-0 z-10 mb-[-1px]",
                !isActive && "border-b border-border/50",
                getBorderRadius(),
                !isFirst && "-ml-px", // Overlap borders
                "group cursor-pointer transition-colors",
                !isActive && "hover:bg-muted"
              )}
              onClick={() => handleTabClick(tab.id)}
              onDoubleClick={() => handleStartEdit(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
            >
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                className="h-6 text-xs font-medium px-1.5 py-0.5"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              <span className="flex-1 text-xs font-medium truncate text-foreground">
                {tab.name}
              </span>
            )}
          </div>
        );
        })
      )}
      <button
        onClick={handleCreateTab}
        className={cn(
          "px-2 py-1.5 border-t border-r border-border/50",
          "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
          "transition-colors",
          "rounded-tr-lg rounded-tl-[0px]", // Only round top-right, explicitly no top-left
          tabs.length > 0 && "-ml-px" // Overlap with last tab if tabs exist
        )}
        title="New tab"
      >
        <Plus className="size-4" />
      </button>

      {/* Context Menu */}
      {contextMenu && typeof window !== "undefined" && createPortal(
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
          {tabs.length > 1 && (
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                void handleRemoveTab(contextMenu.tabId);
              }}
            >
              <Trash2 className="size-4" />
              Delete Tab
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

