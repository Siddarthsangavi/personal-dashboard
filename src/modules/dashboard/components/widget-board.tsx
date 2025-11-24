"use client";

import { useMemo, useCallback, memo, useState, useEffect, useRef, type ReactNode } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import { WidgetFrame } from "./widget-frame";
import { useDashboardStore } from "../store/dashboard-store";
import { GRID_SETTINGS, SurfaceStyle } from "../types";
import { useElementSize } from "../hooks/use-element-size";
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

  const handleRemove = useCallback(
    (id: number) => {
      void onRemove(id);
    },
    [onRemove]
  );

  // Hide title bar for widgets that don't need titles
  const hideTitleBar = widget.type === "quick-links" || 
                       widget.type === "analog-clock" || 
                       widget.type === "date" || 
                       widget.type === "digital-clock" ||
                       widget.type === "calendar";

  return (
    <WidgetFrame
      widget={widget}
      surface={surface}
      headerActions={headerActions ?? undefined}
      onRemove={handleRemove}
      onDragPointerDown={() => {}} // Handled by react-grid-layout
      onResizePointerDown={() => {}} // Handled by react-grid-layout
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
  const currentPage = useDashboardStore((state) => state.currentPage);
  const allWidgets = useDashboardStore((state) => state.widgets);
  const surface = useDashboardStore((state) => state.surfaceStyle);
  const updateLayout = useDashboardStore((state) => state.updateWidgetLayout);
  const removeWidgetStore = useDashboardStore((state) => state.removeWidget);
  const { showToast } = useToast();

  const widgets = useMemo(
    () => allWidgets.filter((w) => w.pageId === currentPage),
    [allWidgets, currentPage]
  );

  const [boardRef, { width, height }] = useElementSize<HTMLDivElement>();
  const fixingWidgetsRef = useRef(false);
  const lastMaxRowsRef = useRef<number | null>(null);

  const removeWidget = useCallback(
    async (id: number) => {
      await removeWidgetStore(id);
      showToast("Widget removed", "success");
    },
    [removeWidgetStore, showToast]
  );

  const setMaxRows = useDashboardStore((state) => state.setMaxRows);

  // Calculate max rows based on actual board height
  const maxRows = useMemo(() => {
    if (!height || height <= 0) return 20; // fallback
    const rowUnit = GRID_SETTINGS.rowHeight + GRID_SETTINGS.gap;
    // Calculate max rows that fit in available height, be very conservative
    // Subtract extra margin to ensure no overflow
    const calculated = Math.floor((height - GRID_SETTINGS.gap * 2) / rowUnit);
    return Math.max(1, calculated);
  }, [height]);

  // Update store with current maxRows so addWidgets can use it
  useEffect(() => {
    if (maxRows > 0) {
      setMaxRows(maxRows);
    }
  }, [maxRows, setMaxRows]);

  // Convert widgets to react-grid-layout format
  const layout = useMemo((): Layout[] => {
    return widgets.map((widget) => {
      // For analog-clock, enforce square constraints
      if (widget.type === "analog-clock") {
        const minSize = Math.max(widget.minSize.w, widget.minSize.h);
        // Allow growing to any square size up to grid boundaries
        const maxSizeX = GRID_SETTINGS.columns - widget.position.x;
        const maxSizeY = maxRows - widget.position.y;
        const maxSize = Math.min(GRID_SETTINGS.columns, maxRows, maxSizeX, maxSizeY);
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
        maxW: widget.type === "date" ? 3 : GRID_SETTINGS.columns,
        maxH: widget.type === "date" ? 1 : maxRows,
      };
    });
  }, [widgets, maxRows]);


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
          
          // Clamp to valid range
          const maxSizeX = GRID_SETTINGS.columns - item.x;
          const maxSizeY = maxRows - item.y;
          const maxSize = Math.min(maxSizeX, maxSizeY);
          
          const squareSize = Math.max(
            minSize,
            Math.min(targetSize, maxSize)
          );
          
          // Ensure position doesn't exceed boundaries with new square size
          const maxValidX = Math.max(0, GRID_SETTINGS.columns - squareSize);
          const maxValidY = Math.max(0, maxRows - squareSize);
          const newX = Math.max(0, Math.min(item.x, maxValidX));
          const newY = Math.max(0, Math.min(item.y, maxValidY));
          
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
        const newX = Math.max(0, Math.min(item.x, GRID_SETTINGS.columns - item.w));
        
        // Ensure widget doesn't exceed bottom boundary (strict check)
        // Widget's bottom row (y + h) must be <= maxRows
        const maxValidY = Math.max(0, maxRows - item.h);
        const newY = Math.max(0, Math.min(item.y, maxValidY));
        
        // Ensure widget doesn't exceed right boundary
        const newW = Math.max(
          widget.minSize.w,
          Math.min(item.w, GRID_SETTINGS.columns - newX)
        );
        
        // Ensure widget doesn't exceed bottom boundary
        const maxValidH = Math.max(widget.minSize.h, maxRows - newY);
        const newH = Math.max(
          widget.minSize.h,
          Math.min(item.h, maxValidH)
        );
        
        // Final check: ensure widget bottom doesn't exceed maxRows
        if (newY + newH > maxRows) {
          // Clamp to valid position
          const clampedY = Math.max(0, maxRows - newH);
          const clampedH = Math.max(widget.minSize.h, maxRows - clampedY);
          // Use clamped values
          const finalY = clampedY;
          const finalH = clampedH;

          // Only update if position or size actually changed
          if (
            widget.position.x !== newX ||
            widget.position.y !== finalY ||
            widget.size.w !== newW ||
            widget.size.h !== finalH
          ) {
            updateLayout(
              widgetId,
              {
                position: { x: newX, y: finalY },
                size: { w: newW, h: finalH },
              },
              { persist: false }
            );
          }
        } else {
          // Widget is within bounds, use original values
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
        }
      });
    },
    [widgets, maxRows, updateLayout]
  );

  // Handle layout change end (persist to DB)
  const handleLayoutChangeEnd = useCallback(() => {
    const currentWidgets = useDashboardStore.getState().widgets.filter(
      (w) => w.pageId === currentPage
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
  }, [currentPage, updateLayout]);

  // Calculate rowHeight to match column width for square widgets
  // Column width = (width - gaps) / columns
  // For squares: rowHeight should equal columnWidth exactly
  const rowHeight = useMemo(() => {
    if (!width || width <= 0) return GRID_SETTINGS.rowHeight;
    // Total gap space: (columns + 1) gaps between and around columns
    const totalGapWidth = GRID_SETTINGS.gap * (GRID_SETTINGS.columns + 1);
    const availableWidth = width - totalGapWidth;
    const columnWidth = availableWidth / GRID_SETTINGS.columns;
    // Use the calculated column width as row height to ensure 1x1 widgets are square
    // Don't use Math.max - use the calculated value directly
    return Math.floor(columnWidth);
  }, [width]);
  const margin: [number, number] = [GRID_SETTINGS.gap, GRID_SETTINGS.gap];

  // Fix widgets that are out of bounds when maxRows changes (only when maxRows actually changes)
  useEffect(() => {
    if (!maxRows || maxRows <= 0) return;
    
    // Only run if maxRows actually changed, not on every widget update
    if (lastMaxRowsRef.current === maxRows) return;
    lastMaxRowsRef.current = maxRows;
    
    // Prevent infinite loops
    if (fixingWidgetsRef.current) return;
    fixingWidgetsRef.current = true;
    
    // Use setTimeout to batch updates and prevent immediate re-triggering
    const timeoutId = setTimeout(() => {
      // Get current widgets from store to avoid dependency
      const currentWidgets = useDashboardStore.getState().widgets.filter(
        (w) => w.pageId === currentPage
      );
      
      const widgetsToFix: Array<{ id: number; position: { x: number; y: number }; size: { w: number; h: number } }> = [];
      
      currentWidgets.forEach((widget) => {
        const widgetBottom = widget.position.y + widget.size.h;
        const maxX = GRID_SETTINGS.columns - widget.size.w;
        const maxY = Math.max(0, maxRows - widget.size.h);
        
        let needsFix = false;
        let newX = widget.position.x;
        let newY = widget.position.y;
        const newW = widget.size.w;
        let newH = widget.size.h;
        
        // Check right boundary
        if (widget.position.x > maxX) {
          newX = Math.max(0, maxX);
          needsFix = true;
        }
        
        // Check bottom boundary
        if (widgetBottom > maxRows) {
          newY = Math.max(0, maxY);
          // Also ensure height doesn't exceed available space
          const maxValidH = Math.max(widget.minSize.h, maxRows - newY);
          if (widget.size.h > maxValidH) {
            newH = maxValidH;
          }
          needsFix = true;
        }
        
        if (needsFix) {
          widgetsToFix.push({
            id: widget.id,
            position: { x: newX, y: newY },
            size: { w: newW, h: newH },
          });
        }
      });
      
      // Batch update all widgets that need fixing (only if there are any)
      if (widgetsToFix.length > 0) {
        // Update all at once to prevent cascading updates
        widgetsToFix.forEach(({ id, position, size }) => {
          updateLayout(id, { position, size }, { persist: true });
        });
      }
      
      fixingWidgetsRef.current = false;
    }, 200); // Increased timeout to prevent rapid re-triggering
    
    return () => {
      clearTimeout(timeoutId);
      fixingWidgetsRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxRows, currentPage]); // Only depend on maxRows and currentPage

  // Calculate the minimum height needed to display all widgets
  const minGridHeight = useMemo(() => {
    if (widgets.length === 0) return height || 0;
    const rowUnit = GRID_SETTINGS.rowHeight + GRID_SETTINGS.gap;
    const maxWidgetBottom = Math.max(
      ...widgets.map((w) => w.position.y + w.size.h),
      0
    );
    // Add some padding at the bottom
    return Math.max((maxWidgetBottom + 2) * rowUnit, height || 0);
  }, [widgets, height]);

  // Add custom CSS for react-grid-layout
  const gridLayoutStyle = useMemo(() => ({
    minHeight: `${minGridHeight}px`,
    height: "auto",
  }), [minGridHeight]);

  return (
    <section className="dashboard-board">
      <div
        className="dashboard-board__canvas"
        ref={boardRef}
        style={{ width: "100%" }}
      >
        {width > 0 && height > 0 && (
          <GridLayout
            className="layout"
            style={gridLayoutStyle}
            layout={layout}
            cols={GRID_SETTINGS.columns}
            rowHeight={rowHeight}
            width={width}
            margin={margin}
            containerPadding={[0, 0]}
            isDraggable={true}
            isResizable={true}
            preventCollision={true}
            compactType={null} // Don't auto-compact, respect positions
            onLayoutChange={handleLayoutChange}
            onDragStop={handleLayoutChangeEnd}
            onResizeStop={handleLayoutChangeEnd}
            maxRows={maxRows}
            isBounded={true} // Keep widgets within bounds
            draggableHandle=".widget-card__title, .widget-card__drag-area, .widget-card--quick-links"
            resizeHandles={["se"]} // Only bottom-right resize handle
            useCSSTransforms={true}
          >
            {widgets.map((widget) => (
              <div key={widget.id.toString()} data-widget-type={widget.type}>
                <WidgetHost
                  widget={widget}
                  surface={surface}
                  onRemove={removeWidget}
                />
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </section>
  );
}
