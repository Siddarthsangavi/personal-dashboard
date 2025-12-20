"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetContextMenuProps {
  widgetId: number;
  widgetTitle: string;
  onDelete: (widgetId: number) => void;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function WidgetContextMenu({
  widgetId,
  widgetTitle,
  onDelete,
  position,
  onClose,
}: WidgetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Add listeners after a small delay to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [position, onClose]);

  if (!position) return null;

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] w-48 rounded-xl border border-border/70 bg-card p-2 shadow-2xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-col gap-2">
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm",
            "bg-accent hover:bg-accent-2 transition-colors"
          )}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            // Dispatch a global edit event that widgets can listen for
            try {
              window.dispatchEvent(new CustomEvent('widget-edit', { detail: { widgetId } }));
            } catch {
              // noop in non-browser
            }
            onClose();
          }}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          Edit
        </button>

        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400",
            "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30",
            "transition-colors"
          )}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(widgetId);
            onClose();
          }}
        >
          <Trash2 className="size-4" />
          Delete widget
        </button>
      </div>
    </div>
  );

  if (typeof window === "undefined" || !document.body) {
    return null;
  }

  return createPortal(menuContent, document.body);
}

