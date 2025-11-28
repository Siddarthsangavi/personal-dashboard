"use client";

import { Button } from "@/components/ui/button";
import { SquareStack } from "lucide-react";

interface DashboardToolbarProps {
  onAdd: () => void;
}

export function DashboardToolbar({ onAdd }: DashboardToolbarProps) {
  return (
    <div className="flex items-center justify-end">
      <Button onClick={onAdd} size="sm" className="gap-2 rounded-xl">
        <SquareStack className="size-4" />
        Add Widget
      </Button>
    </div>
  );
}

