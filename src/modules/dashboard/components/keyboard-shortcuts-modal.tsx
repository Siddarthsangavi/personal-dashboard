"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    keys: ["⌘", "K"],
    description: "Show keyboard shortcuts",
    mac: true,
  },
  {
    keys: ["Ctrl", "K"],
    description: "Show keyboard shortcuts",
    mac: false,
  },
  {
    keys: ["⌘", "D"],
    description: "Duplicate last widget",
    mac: true,
  },
  {
    keys: ["Ctrl", "D"],
    description: "Duplicate last widget",
    mac: false,
  },
  {
    keys: ["⌘", "N"],
    description: "Create new page",
    mac: true,
  },
  {
    keys: ["Ctrl", "N"],
    description: "Create new page",
    mac: false,
  },
  {
    keys: ["Delete"],
    description: "Remove last widget",
    mac: true,
  },
  {
    keys: ["Backspace"],
    description: "Remove last widget",
    mac: false,
  },
];

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const filteredShortcuts = shortcuts.filter((s) => s.mac === isMac || !s.mac);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and manage your dashboard faster.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {filteredShortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex}>
                    <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
                      {key}
                    </kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

