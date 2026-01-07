"use client";

import { useMemo, useCallback, memo, useState, useEffect, useRef, type ReactNode } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import { WidgetFrame } from "./widget-frame";
import { quickLinkRepository } from "@/lib/db";
import { useDashboardStore } from "../store/dashboard-store";
import { GRID_SETTINGS, SurfaceStyle } from "../types";
import { useElementSize } from "../hooks/use-element-size";
import { useResponsiveGrid } from "../hooks/use-responsive-grid";
import { WidgetRecord } from "../types";
import { WidgetRenderer } from "@/modules/widgets/widget-renderer";
import { useToast } from "@/components/ui/toast";
import "react-grid-layout/css/styles.css";

interface WidgetHostProps {
  widget: WidgetRecord;
  surface: SurfaceStyle;
  onRemove: (id: number) => void;
}

const WidgetHost = memo(function WidgetHost({
  widget,
  surface,
  onRemove,
}: WidgetHostProps) {
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const [isFolder, setIsFolder] = useState(false);

  const handleRemove = useCallback(
    (id: number) => {
      void onRemove(id);
    },
    [onRemove]
  );

  // Hide title bar for widgets that don't need titles
  const hideTitleBar = widget.type === "quick-links" || 
                       (widget.type === "bookmark" && !isFolder) ||
                       widget.type === "analog-clock" || 
                       widget.type === "date" || 
                       widget.type === "digital-clock" ||
                       widget.type === "calendar";

  // Determine folder status by checking quicklink count for bookmark widgets
  useEffect(() => {
    let mounted = true;
    if (widget.type !== "bookmark") return;
    void (async () => {
      try {
        const items = await quickLinkRepository.list(widget.id);
        if (!mounted) return;
        // Only treat as folder when there are multiple quicklinks.
        // Do not infer folder purely from widget size (bookmarks can be 2x2 single links).
        setIsFolder((items ?? []).length > 1);
      } catch (err) {
        // ignore
      }
    })();
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce?.detail?.widgetId === widget.id) {
        void (async () => {
          try {
            const items = await quickLinkRepository.list(widget.id);
            if (!mounted) return;
            setIsFolder((items ?? []).length > 1);
          } catch {
            // ignore
          }
        })();
      }
    };
    window.addEventListener('quicklinks-updated', handler as EventListener);
    return () => { mounted = false; window.removeEventListener('quicklinks-updated', handler as EventListener); };
  }, [widget.id, widget.type]);

  return (
    <WidgetFrame
      widget={widget}
      surface={surface}
      headerActions={headerActions ?? undefined}
      onRemove={handleRemove}
      onDragPointerDown={() => {}} // Handled by react-grid-layout
      onResizePointerDown={() => {}} // Handled by react-grid-layout
      disableResize={widget.type === "bookmark" && isFolder}
      hideTitleBar={hideTitleBar}
    >
      <WidgetRenderer
        widget={widget}
        setHeaderActions={setHeaderActions}
        onRemove={handleRemove}
      />
    </WidgetFrame>
  );
});

export function WidgetBoard() {
  const currentTabId = useDashboardStore((state) => state.currentTabId);
  const allWidgets = useDashboardStore((state) => state.widgets);
  const surface = useDashboardStore((state) => state.surfaceStyle);
  const updateLayout = useDashboardStore((state) => state.updateWidgetLayout);
  const removeWidgetStore = useDashboardStore((state) => state.removeWidget);
  const { showToast } = useToast();

  const widgets = useMemo(
    () => {
      if (!currentTabId) {
        return [];
      }
      return allWidgets.filter((w) => w.pageId === currentTabId);
    },
    [allWidgets, currentTabId]
  );

  const [boardRef, { width, height }] = useElementSize<HTMLDivElement>();
  // Use actual width for grid, but calculate column width based on fixed 1200px to prevent shrinking
  const { columns: responsiveColumns, minColumnWidth } = useResponsiveGrid(width);

  const removeWidget = useCallback(
    async (id: number) => {
      await removeWidgetStore(id);
      showToast("Widget removed", "success");
    },
    [removeWidgetStore, showToast]
  );

  // Convert widgets to react-grid-layout format
  const layout = useMemo((): Layout[] => {
    return widgets.map((widget) => {
      // For analog-clock, enforce square constraints
      if (widget.type === "analog-clock") {
        const minSize = Math.max(widget.minSize.w, widget.minSize.h);
        // Allow growing to any square size up to grid boundaries (unlimited rows)
        const maxSizeX = responsiveColumns - widget.position.x;
        const maxSize = Math.min(responsiveColumns, maxSizeX);
        return {
          i: widget.id.toString(),
          x: widget.position.x,
          y: widget.position.y,
          w: widget.size.w,
          h: widget.size.h,
          minW: minSize,
          minH: minSize,
          maxW: maxSize,
          maxH: maxSize,
        };
      }
      return {
        i: widget.id.toString(),
        x: widget.position.x,
        y: widget.position.y,
        w: widget.size.w,
        h: widget.size.h,
        minW: widget.minSize.w,
        minH: widget.minSize.h,
        maxW: widget.type === "date" ? 3 : responsiveColumns,
        maxH: widget.type === "date" ? 1 : undefined, // Unlimited height
      };
    });
  }, [widgets, responsiveColumns]);


  // Handle layout change from react-grid-layout
  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      // Update each widget that changed
      newLayout.forEach((item) => {
        const widgetId = parseInt(item.i, 10);
        const widget = widgets.find((w) => w.id === widgetId);
        if (!widget) return;

        // For date widget, prevent any size changes
        if (widget.type === "date") {
          if (item.w !== widget.size.w || item.h !== widget.size.h) {
            // Revert to original size
            updateLayout(
              widgetId,
              {
                position: { x: item.x, y: item.y },
                size: { w: widget.size.w, h: widget.size.h },
              },
              { persist: false }
            );
          } else {
            // Only update position if size hasn't changed
            if (widget.position.x !== item.x || widget.position.y !== item.y) {
              updateLayout(
                widgetId,
                {
                  position: { x: item.x, y: item.y },
                  size: widget.size,
                },
                { persist: false }
              );
            }
          }
          return;
        }

        // For analog-clock widget, enforce square resizing
        if (widget.type === "analog-clock") {
          const minSize = Math.max(widget.minSize.w, widget.minSize.h);
          
          // Determine which dimension changed more from the original widget size
          // Use the dimension that changed more as the target size
          const widthDelta = item.w - widget.size.w;
          const heightDelta = item.h - widget.size.h;
          const absWidthDelta = Math.abs(widthDelta);
          const absHeightDelta = Math.abs(heightDelta);
          
          let targetSize: number;
          if (absWidthDelta > absHeightDelta) {
            // Width changed more - use width
            targetSize = item.w;
          } else if (absHeightDelta > absWidthDelta) {
            // Height changed more - use height
            targetSize = item.h;
          } else {
            // Equal change - if both increased, use max; if both decreased, use min
            if (widthDelta > 0 || heightDelta > 0) {
              targetSize = Math.max(item.w, item.h);
            } else {
              targetSize = Math.min(item.w, item.h);
            }
          }
          
          // Clamp to valid range (unlimited rows)
          const maxSizeX = responsiveColumns - item.x;
          const maxSize = maxSizeX;
          
          const squareSize = Math.max(
            minSize,
            Math.min(targetSize, maxSize)
          );
          
          // Ensure position doesn't exceed boundaries with new square size
          const maxValidX = Math.max(0, responsiveColumns - squareSize);
          const newX = Math.max(0, Math.min(item.x, maxValidX));
          const newY = Math.max(0, item.y); // No upper limit on Y
          
          // Always enforce square - update immediately if not square
          // This ensures the widget is always square during resize
          if (
            item.w !== squareSize ||
            item.h !== squareSize ||
            widget.size.w !== squareSize ||
            widget.size.h !== squareSize ||
            widget.position.x !== newX ||
            widget.position.y !== newY
          ) {
            updateLayout(
              widgetId,
              {
                position: { x: newX, y: newY },
                size: { w: squareSize, h: squareSize },
              },
              { persist: false }
            );
          }
          return;
        }

        // Ensure widget doesn't exceed right boundary
        const newX = Math.max(0, Math.min(item.x, responsiveColumns - item.w));
        
        // No upper limit on Y position (unlimited rows)
        const newY = Math.max(0, item.y);
        
        // Ensure widget doesn't exceed right boundary
        const newW = Math.max(
          widget.minSize.w,
          Math.min(item.w, responsiveColumns - newX)
        );
        
        // No upper limit on height (unlimited rows)
        const newH = Math.max(widget.minSize.h, item.h);
        
          // Only update if position or size actually changed
          if (
            widget.position.x !== newX ||
            widget.position.y !== newY ||
            widget.size.w !== newW ||
            widget.size.h !== newH
          ) {
            updateLayout(
              widgetId,
              {
                position: { x: newX, y: newY },
                size: { w: newW, h: newH },
              },
              { persist: false }
            );
        }
      });
    },
    [widgets, updateLayout]
  );

  // Handle layout change end (persist to DB)
  const handleLayoutChangeEnd = useCallback(() => {
    const currentWidgets = useDashboardStore.getState().widgets.filter(
      (w) => w.pageId === currentTabId
    );
    // Persist all widgets on this page
    currentWidgets.forEach((widget) => {
      updateLayout(
        widget.id,
        {
          position: widget.position,
          size: widget.size,
        },
        { persist: true }
      );
    });
  }, [currentTabId, updateLayout]);

  // Handle drag stop to support merging bookmark widgets into a folder
  const handleDragStop = useCallback(async (layout: Layout[], oldItem: any, newItem: any, placeholder: any, e?: MouseEvent) => {
    try {
      const movedId = parseInt(newItem.i, 10);
      const movedWidget = widgets.find((w) => w.id === movedId);
      if (!movedWidget) return handleLayoutChangeEnd();
      // If we have an event, try to detect the widget under the drop point.
      let targetWidget: WidgetRecord | undefined;
      if (e && typeof e.clientX === "number" && typeof e.clientY === "number") {
        // Prefer elementsFromPoint so we can skip the moved element if it's on top
        const els = (document as any).elementsFromPoint
          ? (document as any).elementsFromPoint(e.clientX, e.clientY) as HTMLElement[]
          : [document.elementFromPoint(e.clientX, e.clientY) as HTMLElement].filter(Boolean) as HTMLElement[];
        for (const el of els) {
          if (!el) continue;
          const host = el.closest('[data-widget-id]') as HTMLElement | null;
          if (!host) continue;
          const idAttr = host.getAttribute('data-widget-id');
          const typeAttr = host.getAttribute('data-widget-type');
          if (!idAttr) continue;
          const targetId = parseInt(idAttr, 10);
          if (isNaN(targetId)) continue;
          if (targetId === movedId) continue; // skip the moved widget itself
          if (typeAttr !== 'bookmark') continue;
          targetWidget = widgets.find((w) => w.id === targetId);
          if (targetWidget) break;
        }
      }

      if (targetWidget) {
        // Move all quick links from movedWidget to targetWidget
        const movedLinks = await quickLinkRepository.list(movedWidget.id);
        if ((movedLinks ?? []).length > 0) {
          await Promise.all(movedLinks.map((link) => quickLinkRepository.update(link.id, { widgetId: targetWidget!.id })));

          // Ensure the parent folder widget is 2x2
          await updateLayout(targetWidget.id, { position: targetWidget.position, size: { w: 2, h: 2 } }, { persist: true });

          // Remove the moved (now-empty) widget
          await removeWidgetStore(movedWidget.id);

          // Notify any listeners that quicklinks have changed for the target widget
          try {
            window.dispatchEvent(new CustomEvent('quicklinks-updated', { detail: { widgetId: targetWidget.id } }));
          } catch (err) {
            // noop in non-browser
          }

          showToast("Created folder", "success");
          return;
        } else {
          // Nothing to move - avoid deleting the source widget accidentally
          showToast("No links to move", "neutral");
          return;
        }
      }
    } catch (err) {
      // ignore
    }

    // Fallback: persist positions after normal drag stop
    handleLayoutChangeEnd();
  }, [widgets, removeWidgetStore, updateLayout, showToast, handleLayoutChangeEnd]);

  // Calculate rowHeight to match column width for square widgets
  // Use fixed column width (based on 1200px) to prevent shrinking, but allow grid to expand
  const rowHeight = useMemo(() => {
    // Use the fixed column width from responsiveGrid (calculated from 1200px)
    // This ensures widgets maintain their size even when grid expands
    return Math.floor(minColumnWidth);
  }, [minColumnWidth]);
  const margin: [number, number] = [GRID_SETTINGS.gap, GRID_SETTINGS.gap];


  // Calculate the minimum height needed to display all widgets
  const minGridHeight = useMemo(() => {
    if (widgets.length === 0) return 0; // No min height when empty
    const rowUnit = GRID_SETTINGS.rowHeight + GRID_SETTINGS.gap;
    const maxWidgetBottom = Math.max(
      ...widgets.map((w) => w.position.y + w.size.h),
      0
    );
    // Add some padding at the bottom
    return (maxWidgetBottom + 2) * rowUnit;
  }, [widgets]);

  // Add custom CSS for react-grid-layout
  const gridLayoutStyle = useMemo(() => ({
    minHeight: `${minGridHeight}px`,
    height: "auto",
  }), [minGridHeight]);

  return (
    <section className="dashboard-board" style={{ minHeight: '400px', width: '100%', minWidth: '1200px' }}>
      <div
        className="dashboard-board__canvas"
        ref={boardRef}
        style={{ width: "100%", minWidth: '1200px', minHeight: '400px' }}
      >
        {width > 0 && height > 0 ? (
          <GridLayout
            className="layout"
            style={gridLayoutStyle}
            layout={layout}
            cols={responsiveColumns}
            rowHeight={rowHeight}
            width={width}
            margin={margin}
            containerPadding={[0, 0]}
            isDraggable={true}
            isResizable={true}
            preventCollision={true}
            compactType={null} // Don't auto-compact, respect positions
            onLayoutChange={handleLayoutChange}
            onDragStop={handleDragStop}
            onResizeStop={handleLayoutChangeEnd}
            isBounded={false} // Allow unlimited rows
            draggableHandle=".widget-card__title, .widget-card__drag-area, .widget-card--quick-links, .widget-card--bookmark"
            resizeHandles={["se"]} // Only bottom-right resize handle
            useCSSTransforms={true}
          >
            {widgets.map((widget) => (
              <div key={widget.id.toString()} data-widget-type={widget.type} data-widget-id={widget.id}>
                <WidgetHost
                  widget={widget}
                  surface={surface}
                  onRemove={removeWidget}
                />
              </div>
            ))}
          </GridLayout>
        ) : widgets.length > 0 ? (
          <div className="text-muted-foreground text-sm p-4">
            Initializing board... ({widgets.length} widget{widgets.length !== 1 ? 's' : ''} ready)
          </div>
        ) : null}
      </div>
    </section>
  );
}
