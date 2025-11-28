"use client";

import {
  PropsWithChildren,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
  type ReactNode,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { SurfaceStyle, WidgetRecord } from "@/modules/dashboard/types";
import { WidgetContextMenu } from "./widget-context-menu";

interface WidgetFrameProps extends PropsWithChildren {
  widget: WidgetRecord;
  surface: SurfaceStyle;
  headerActions?: ReactNode;
  onRemove: (widgetId: number) => void;
  onDragPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    widgetId: number
  ) => void;
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    widgetId: number
  ) => void;
  style?: CSSProperties;
  className?: string;
  hideTitleBar?: boolean;
}

export function WidgetFrame({
  widget,
  surface,
  headerActions,
  children,
  onRemove,
  onDragPointerDown,
  onResizePointerDown,
  style,
  className,
  hideTitleBar = false,
}: WidgetFrameProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
            <div
              className={cn(
                "widget-card",
                surface === "glass" && "surface--glass",
                surface === "neumorphic" && "surface--neumorphic",
                surface === "default" && "surface--default",
                widget.type === "quick-links" && "widget-card--quick-links",
                widget.type === "date" && "widget-card--date",
                className
              )}
              style={style}
              onContextMenu={handleContextMenu}
            >
              <div className="widget-card__surface flex flex-col">
                {!hideTitleBar && (
                <header className={cn("widget-card__chrome")}>
                  <div className={cn("flex items-center gap-2", hideTitleBar ? "w-full justify-end" : "flex-1")}>
                    {!hideTitleBar && (
                    <div 
                      className="widget-card__title flex-1 select-none"
                      onPointerDown={(e) => {
                        // Only handle drag if not clicking on any interactive element
                        const target = e.target as HTMLElement;
                        
                        // Check if click originated from button area or any interactive element
                        const isInteractive = target.closest('button') || 
                                             target.closest('a') ||
                                             target.closest('input') ||
                                             target.closest('textarea') ||
                                             target.closest('[data-widget-actions]') ||
                                             target.closest('[data-slot="button"]');
                        
                        if (isInteractive) {
                          return; // Don't start drag, let button handle it
                        }
                        // Start drag for title area
                        onDragPointerDown(e, widget.id);
                      }}
                      onKeyDown={(e) => {
                        // Allow keyboard navigation to start drag with Space or Enter
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          // Create a synthetic pointer event for keyboard users
                          const syntheticEvent = {
                            clientX: 0,
                            clientY: 0,
                            currentTarget: e.currentTarget,
                            pointerId: -1,
                            preventDefault: () => {},
                            stopPropagation: () => {},
                          } as unknown as ReactPointerEvent<HTMLElement>;
                          onDragPointerDown(syntheticEvent, widget.id);
                        }
                      }}
                    >
                      {widget.title}
                    </div>
                    )}
                    {headerActions && (
                    <div 
                      className="flex items-center gap-1"
                      data-widget-actions="true"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <div 
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {headerActions}
                      </div>
                    </div>
                    )}
                  </div>
                </header>
                )}
        <div 
          className={cn("widget-card__content", hideTitleBar && "widget-card__drag-area")}
          style={
            // Quick links widget needs no padding in all modes
            widget.type === "quick-links"
              ? { padding: 0 }
              : hideTitleBar && surface === "default"
              ? (widget.type === "digital-clock" || widget.type === "date"
                  ? { padding: 0 } 
                  : undefined)
              : widget.type === "pomodoro"
              ? { padding: "0.15rem" }
              : widget.type === "calendar"
              ? { padding: 0 }
              : undefined
          }
        >
          {children}
        </div>
                {widget.type !== "date" && (
                <div
                  className="widget-card__resizer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Resize ${widget.title} widget`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    onResizePointerDown(event, widget.id);
                  }}
                  onKeyDown={(e) => {
                    // Allow keyboard navigation for resize
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      const syntheticEvent = {
                        clientX: 0,
                        clientY: 0,
                        currentTarget: e.currentTarget,
                        pointerId: -1,
                        preventDefault: () => {},
                        stopPropagation: () => {},
                      } as unknown as ReactPointerEvent<HTMLElement>;
                      onResizePointerDown(syntheticEvent, widget.id);
                    }
                  }}
                />
                )}
      </div>
      </div>
      <WidgetContextMenu
        widgetId={widget.id}
        widgetTitle={widget.title}
        onDelete={onRemove}
        position={contextMenu}
        onClose={() => setContextMenu(null)}
      />
    </>
  );
}

