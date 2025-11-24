"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "../store/dashboard-store";
import { DashboardToolbar } from "./dashboard-toolbar";
import { WidgetBoard } from "./widget-board";
import { EmptyState } from "./empty-state";
import { WidgetPicker } from "./widget-picker";
import { PageNavigation } from "./page-navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";

export function DashboardShell() {
  const hydrate = useDashboardStore((state) => state.hydrate);
  const loading = useDashboardStore((state) => state.loading);
  const widgets = useDashboardStore((state) => state.widgets);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useKeyboardShortcuts(() => setShortcutsOpen(true));

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const hasWidgets = widgets.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden relative">
      {/* Background container that extends to bottom of screen */}
      <div className="absolute inset-0 bg-background -z-10" />
      
      <div className="flex-shrink-0 space-y-3 p-4 relative z-0">
        <DashboardToolbar
          onAdd={() => setPickerOpen(true)}
          onShowShortcuts={() => setShortcutsOpen(true)}
        />
        {hasWidgets && <PageNavigation />}
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
        ) : hasWidgets ? (
          <WidgetBoard />
        ) : (
          <EmptyState onAdd={() => setPickerOpen(true)} />
        )}
      </div>

      <WidgetPicker open={pickerOpen} onOpenChange={setPickerOpen} />
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

