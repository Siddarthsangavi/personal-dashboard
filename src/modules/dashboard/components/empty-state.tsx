"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, LayoutGrid, Zap } from "lucide-react";
import Image from "next/image";

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-8 rounded-3xl border border-dashed border-border/60 bg-background/40 p-16 text-center backdrop-blur-sm">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative rounded-full border-2 border-primary/20 bg-primary/5 p-4">
          <Image 
            src="/icon.svg" 
            alt="Panelaris Logo" 
            width={32} 
            height={32}
            className="dark:invert"
          />
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-bold tracking-tight">
          Build your personalized space
        </h2>
        <p className="mx-auto max-w-md text-muted-foreground">
          Start by adding widgets. Mix and match todos, notes, quick links, clock, weather, and calendar widgets to create your perfect dashboard.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Button size="lg" onClick={onAdd} className="gap-2">
          <Zap className="size-4" />
          Add your first widget
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-lg border border-border/40 bg-background/60 p-2">
            <Sparkles className="size-4" />
          </div>
          <span>Customizable</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-lg border border-border/40 bg-background/60 p-2">
            <LayoutGrid className="size-4" />
          </div>
          <span>Drag & Drop</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-lg border border-border/40 bg-background/60 p-2">
            <Zap className="size-4" />
          </div>
          <span>Fast</span>
        </div>
      </div>
    </div>
  );
}

