"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Plus, X, Edit2 } from "lucide-react";
import { useDashboardStore } from "../store/dashboard-store";

export function PageNavigation() {
  const currentTabId = useDashboardStore((state) => state.currentTabId);
  const tabs = useDashboardStore((state) => state.tabs);
  const setCurrentTabId = useDashboardStore((state) => state.setCurrentTabId);
  const createTab = useDashboardStore((state) => state.createTab);
  const updateTab = useDashboardStore((state) => state.updateTab);
  const removeTab = useDashboardStore((state) => state.removeTab);
  
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentTabIndex = tabs.findIndex(t => t.id === currentTabId);
  const currentTab = tabs[currentTabIndex];
  
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartEdit = (tab: typeof tabs[0]) => {
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

  const goToTab = (direction: "prev" | "next") => {
    if (tabs.length === 0) return;
    const newIndex = direction === "prev" 
      ? (currentTabIndex - 1 + tabs.length) % tabs.length
      : (currentTabIndex + 1) % tabs.length;
    void setCurrentTabId(tabs[newIndex].id);
  };

  const handleCreateTab = async () => {
    await createTab();
  };

  const handleRemoveTab = async (tabId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return; // Don't allow removing the last tab
    await removeTab(tabId);
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/80 px-3 py-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToTab("prev")}
        disabled={tabs.length <= 1}
        className="h-7 w-7"
      >
        <ChevronLeft className="size-4" />
      </Button>
      
      <div className="flex items-center gap-1 flex-1 min-w-0 group">
        {editingTabId === currentTab?.id ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm font-medium px-2"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button
              onClick={() => handleStartEdit(currentTab!)}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent/50 text-sm font-medium min-w-0"
              title="Click to rename"
            >
              <span className="truncate">{currentTab?.name || "Tab"}</span>
              <Edit2 className="size-3 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={(e) => handleRemoveTab(currentTab!.id, e)}
              className="p-1 rounded hover:bg-destructive/20 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove tab"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToTab("next")}
        disabled={tabs.length <= 1}
        className="h-7 w-7"
      >
        <ChevronRight className="size-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCreateTab}
        className="ml-2 h-7 w-7"
        title="Create new tab"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
