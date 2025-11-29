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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Widgets</DialogTitle>
        </DialogHeader>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
          {filteredDefinitions.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              <div className="text-sm">No widgets found matching &quot;{searchQuery}&quot;</div>
            </div>
          ) : (
            filteredDefinitions.map((definition) => {
              const IconComponent =
                (Icons as unknown as Record<string, LucideIcon>)[definition.icon] ??
                Icons.LayoutGrid;
              return (
                <button
                  key={definition.type}
                  onClick={() => void handleSelect(definition.type)}
                  className={cn(
                    "group relative flex flex-col gap-3 rounded-lg border-2 p-4 text-left transition-all",
                    "hover:border-primary/50 hover:bg-accent/50 hover:shadow-md",
                    "border-border bg-card/50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex items-center justify-center rounded-lg p-2.5 transition-colors",
                      "bg-primary/10 text-primary group-hover:bg-primary/20"
                    )}>
                      <IconComponent className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                        {definition.title}
                      </div>
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        {definition.description}
                      </div>
                    </div>
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

