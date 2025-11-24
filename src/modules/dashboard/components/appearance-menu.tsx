"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/core/icon-button";
import { useTheme } from "next-themes";
import { Settings2, SunMedium, Moon, Layers, PanelsTopLeft, Sparkles } from "lucide-react";
import { useDashboardStore } from "../store/dashboard-store";
import { SurfaceStyle } from "../types";
import { cn } from "@/lib/utils";

const surfaceOptions: Array<{
  id: SurfaceStyle;
  icon: ReactNode;
  label: string;
}> = [
  { id: "default", icon: <Layers className="size-4" />, label: "Solid" },
  { id: "glass", icon: <PanelsTopLeft className="size-4" />, label: "Glass" },
  { id: "neumorphic", icon: <Sparkles className="size-4" />, label: "Neumorph" },
];

const themeOptions = [
  { id: "light", icon: <SunMedium className="size-4" />, label: "Light" },
  { id: "dark", icon: <Moon className="size-4" />, label: "Dark" },
];

export function AppearanceMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const surface = useDashboardStore((state) => state.surfaceStyle);
  const setSurface = useDashboardStore((state) => state.setSurfaceStyle);

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

  const menuContent = open && (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => setOpen(false)}
      />
      <div
        className="fixed z-[9999] w-64 rounded-2xl border border-border/70 bg-card p-4 shadow-2xl"
        style={{
          top: `${position.top}px`,
          right: `${position.right}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
          <section>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Theme
            </p>
            <div className="mt-2 flex gap-2">
              {themeOptions.map((option) => (
                <IconButton
                  key={option.id}
                  icon={option.icon}
                  label={option.label}
                  className={cn(
                    "border border-transparent text-muted-foreground",
                    resolvedTheme === option.id &&
                      "border-foreground/20 bg-foreground/10 text-foreground"
                  )}
                  onClick={() => {
                    setTheme(option.id);
                  }}
                />
              ))}
            </div>
          </section>

          <section className="mt-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Surface
            </p>
            <div className="mt-2 flex gap-2">
              {surfaceOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-label={option.label}
                  className={cn(
                    "inline-flex items-center justify-center size-9 rounded-full border border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                    surface === option.id &&
                      "border-foreground/20 bg-foreground/10 text-foreground"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    void setSurface(option.id);
                    setOpen(false);
                  }}
                >
                  <span style={{ pointerEvents: 'none' }}>{option.icon}</span>
                  <span className="sr-only">{option.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </>
    );

  return (
    <>
      <div ref={buttonRef} className="relative">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Settings2 className="size-4" />
          Appearance
        </Button>
      </div>
      {typeof window !== 'undefined' && menuContent && createPortal(menuContent, document.body)}
    </>
  );
}
