"use client";

import { useMemo } from "react";
import { useDashboardStore } from "../store/dashboard-store";
import { LayoutGrid } from "lucide-react";
import { widgetCatalog } from "../types";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function WidgetStats() {
  const currentTabId = useDashboardStore((state) => state.currentTabId);
  const getPageWidgets = useDashboardStore((state) => state.getPageWidgets);

  const pageWidgets = useMemo(
    () => currentTabId ? getPageWidgets(currentTabId) : [],
    [getPageWidgets, currentTabId]
  );

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    pageWidgets.forEach((widget) => {
      counts[widget.type] = (counts[widget.type] || 0) + 1;
    });
    return counts;
  }, [pageWidgets]);

  if (pageWidgets.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <LayoutGrid className="size-3" />
      <span>{pageWidgets.length} widget{pageWidgets.length !== 1 ? "s" : ""}</span>
      {Object.entries(stats).length > 1 && (
        <>
          <span className="mx-1">•</span>
          <div className="flex items-center gap-1.5">
            {Object.entries(stats).slice(0, 3).map(([type, count]) => {
              const definition = widgetCatalog[type as keyof typeof widgetCatalog];
              if (!definition) return null;
              const IconComponent =
                (Icons as unknown as Record<string, LucideIcon>)[definition.icon] ?? Icons.LayoutGrid;
              return (
                <div key={type} className="flex items-center gap-1">
                  <IconComponent className="size-3" />
                  <span>{count}</span>
                </div>
              );
            })}
            {Object.entries(stats).length > 3 && (
              <span>+{Object.entries(stats).length - 3}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

