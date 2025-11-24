"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { widgetCatalog, WidgetType } from "../types";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDashboardStore } from "../store/dashboard-store";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Search } from "lucide-react";

interface WidgetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WidgetPicker({ open, onOpenChange }: WidgetPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const addWidgets = useDashboardStore((state) => state.addWidgets);
  const { showToast } = useToast();

  const handleSelect = async (type: WidgetType) => {
    await addWidgets([type]);
    showToast("Widget added successfully", "success");
    setSearchQuery("");
    onOpenChange(false);
  };

  const allDefinitions = useMemo(() => Object.values(widgetCatalog), []);

  const filteredDefinitions = useMemo(() => {
    if (!searchQuery.trim()) return allDefinitions;
    const query = searchQuery.toLowerCase();
    return allDefinitions.filter(
      (def) =>
        def.title.toLowerCase().includes(query) ||
        def.description.toLowerCase().includes(query) ||
        def.type.toLowerCase().includes(query)
    );
  }, [allDefinitions, searchQuery]);

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        onOpenChange(state);
        if (!state) {
          setSearchQuery("");
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select widgets</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
          {filteredDefinitions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No widgets found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredDefinitions.map((definition) => {
            const IconComponent =
              (Icons as Record<string, LucideIcon>)[definition.icon] ??
              Icons.LayoutGrid;
            return (
              <button
                key={definition.type}
                onClick={() => void handleSelect(definition.type)}
                className="flex items-center justify-between rounded-xl border px-4 py-3 text-left transition hover:border-foreground/30 hover:bg-accent border-border bg-background/60"
              >
                <div className="flex items-center gap-3">
                  <IconComponent className="size-5" />
                  <div className="font-semibold">{definition.title}</div>
                </div>
              </button>
            );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

