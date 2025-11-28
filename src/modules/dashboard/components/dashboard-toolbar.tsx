"use client";

import { Button } from "@/components/ui/button";
import { SquareStack } from "lucide-react";
import { useDashboardStore } from "../store/dashboard-store";
import { WidgetStats } from "./widget-stats";
import { cn } from "@/lib/utils";

interface DashboardToolbarProps {
  onAdd: () => void;
}

export function DashboardToolbar({ onAdd }: DashboardToolbarProps) {
  const surface = useDashboardStore((state) => state.surfaceStyle);

  return (
    <div className={cn(
      "flex flex-col gap-3 rounded-2xl px-3 py-3 shadow-md sm:flex-row sm:items-center sm:justify-between",
      surface === "glass" && "surface--glass",
      surface === "neumorphic" && "surface--neumorphic",
      surface === "default" && "border border-border/70 bg-card"
    )}>
      <div className="flex items-center gap-3">
        <WidgetStats />
      </div>
      <div className="flex items-center justify-end gap-3">
        <Button onClick={onAdd} size="sm" className="gap-2 rounded-xl">
          <SquareStack className="size-4" />
          Add Widget
        </Button>
      </div>
    </div>
  );
}

