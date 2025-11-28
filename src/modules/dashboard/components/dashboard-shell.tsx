"use client";

import { useEffect, useState, useMemo } from "react";
import { useDashboardStore } from "../store/dashboard-store";
import { DashboardToolbar } from "./dashboard-toolbar";
import { WidgetBoard } from "./widget-board";
import { EmptyState } from "./empty-state";
import { WidgetPicker } from "./widget-picker";
import { Skeleton } from "@/components/ui/skeleton";
export function DashboardShell() {
  const hydrate = useDashboardStore((state) => state.hydrate);
  const loading = useDashboardStore((state) => state.loading);
  const allWidgets = useDashboardStore((state) => state.widgets);
  const currentTabId = useDashboardStore((state) => state.currentTabId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const tabs = useDashboardStore((state) => state.tabs);
  const setCurrentTabId = useDashboardStore((state) => state.setCurrentTabId);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Ensure currentTabId is set if we have tabs but no currentTabId
  useEffect(() => {
    if (tabs.length > 0 && !currentTabId) {
      void setCurrentTabId(tabs[0].id);
    }
  }, [tabs, currentTabId, setCurrentTabId]);

  // Check if there are widgets for the current tab
  const widgets = useMemo(
    () => currentTabId ? allWidgets.filter((w) => w.pageId === currentTabId) : [],
    [allWidgets, currentTabId]
  );
  const hasWidgets = widgets.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden relative">
      {/* Background container that extends to bottom of screen */}
      <div className="absolute inset-0 bg-background -z-10" />
      
      <div className="flex-shrink-0 p-4 relative z-0">
        <DashboardToolbar
          onAdd={() => setPickerOpen(true)}
        />
      </div>
      <div className="flex-1 overflow-hidden px-4 pb-4 relative z-0">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-48 rounded-xl animate-pulse"
                style={{
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Debug info - remove after fixing */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-2 text-xs text-muted-foreground">
                Debug: currentTabId={currentTabId?.toString() || 'null'}, 
                allWidgets={allWidgets.length}, 
                tabWidgets={widgets.length}
              </div>
            )}
            {hasWidgets ? (
              <WidgetBoard />
            ) : (
              <EmptyState onAdd={() => setPickerOpen(true)} />
            )}
          </>
        )}
      </div>

      <WidgetPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  );
}

