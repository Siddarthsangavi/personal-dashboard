"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Edit2 } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentTab = tabs.find(t => t.id === currentTabId);
  
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartEdit = (tab: typeof tabs[0], e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingTabId(tab.id);
    setEditValue(tab.name);
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

  const handleRemoveTab = async (tabId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return; // Don't allow removing the last tab
    await removeTab(tabId);
  };

  const handleTabClick = (tabId: number) => {
    void setCurrentTabId(tabId);
  };

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
          
          return (
            <div
              key={tab.id}
              className={cn(
                "relative flex items-center gap-1 px-3 py-1.5 min-w-[120px] max-w-[240px]",
                "border-t border-l border-r border-border/50",
                "bg-muted/50",
                isActive && "bg-background border-b-0 z-10 mb-[-1px]",
                !isActive && "border-b border-border/50",
                isFirst && "rounded-tl-lg",
                isLast && !isActive && "rounded-tr-lg",
                !isFirst && "-ml-px", // Overlap borders
                "group cursor-pointer transition-colors",
                !isActive && "hover:bg-muted"
              )}
              onClick={() => handleTabClick(tab.id)}
              onDoubleClick={() => handleStartEdit(tab)}
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
                onDoubleClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="flex-1 text-xs font-medium truncate text-foreground">
                  {tab.name}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleStartEdit(tab, e)}
                    className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                    title="Rename tab"
                  >
                    <Edit2 className="size-3" />
                  </button>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => handleRemoveTab(tab.id, e)}
                      className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      title="Close tab"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        );
        })
      )}
      <button
        onClick={handleCreateTab}
        className={cn(
          "px-2 py-1.5 rounded-tr-lg border-t border-r border-border/50",
          "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
          "transition-colors"
        )}
        title="New tab"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

