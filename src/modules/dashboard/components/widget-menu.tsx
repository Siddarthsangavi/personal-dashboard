"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetMenuProps {
  widgetId: number;
  widgetTitle: string;
  onDelete: (widgetId: number) => void;
}

export function WidgetMenu({ widgetId, widgetTitle, onDelete }: WidgetMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Calculate position for portal
  const [position, setPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  const handleDelete = () => {
    onDelete(widgetId);
    setOpen(false);
  };

  const menuContent = open && (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => setOpen(false)}
      />
      <div
        className="fixed z-[9999] w-48 rounded-xl border border-border/70 bg-card p-2 shadow-2xl"
        style={{
          top: `${position.top}px`,
          right: `${position.right}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleDelete();
          }}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400",
            "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30",
            "transition-colors"
          )}
        >
          <Trash2 className="size-4" />
          <span>Delete widget</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((prev) => !prev);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        className="inline-flex items-center justify-center size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label={`Options for ${widgetTitle}`}
      >
        <MoreVertical className="size-4" />
      </button>
      {typeof window !== 'undefined' && document.body && menuContent && createPortal(menuContent, document.body)}
    </>
  );
}

