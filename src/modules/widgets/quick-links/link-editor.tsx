"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import styles from "./quick-links-widget.module.scss";
import { cn } from "@/lib/utils";

export interface LinkEditorValues {
  label: string;
  url: string;
  icon: string;
}

interface LinkEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<LinkEditorValues>;
  onSave: (values: LinkEditorValues) => Promise<void> | void;
  title?: string;
}

const curatedIcons = [
  "lucide:link-2",
  "mdi:github",
  "mdi:linkedin",
  "mdi:twitter",
  "mdi:spotify",
  "mdi:google",
  "mdi:youtube",
  "mdi:pinterest",
];

export function LinkEditorDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  title = "New quick link",
}: LinkEditorDialogProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [iconName, setIconName] = useState(initial?.icon ?? curatedIcons[0]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconQuery, setIconQuery] = useState("");
  const [iconResults, setIconResults] = useState<string[]>(curatedIcons);

  useEffect(() => {
    setLabel(initial?.label ?? "");
    setUrl(initial?.url ?? "");
    setIconName(initial?.icon ?? curatedIcons[0]);
  }, [initial]);

  useEffect(() => {
    if (!iconQuery.trim()) {
      setIconResults(curatedIcons);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/icons?q=${encodeURIComponent(iconQuery.trim())}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        setIconResults((data.icons as string[]) ?? curatedIcons);
      } catch {
        // noop
      }
    }, 280);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [iconQuery]);

  const handleSave = async () => {
    if (!url.trim()) return;
    await onSave({ label: label.trim() || "Link", url: url.trim(), icon: iconName });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(openState) => {
        onOpenChange(openState);
        if (!openState) {
          setShowIconPicker(false);
          setIconQuery("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Select an icon and paste the destination URL.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border p-3">
              <Icon icon={iconName} width={32} height={32} />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowIconPicker((p) => !p)}>
              {showIconPicker ? "Hide icons" : "Change icon"}
            </Button>
          </div>
          {showIconPicker && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={iconQuery} onChange={(e) => setIconQuery(e.target.value)} placeholder="Search icons" className="pl-9" />
              </div>
              <div className={styles.iconPicker}>
                {iconResults.map((icon) => (
                  <button
                    key={icon}
                    className={cn(styles.iconChoice, icon === iconName && styles.isActive)}
                    onClick={() => setIconName(icon)}
                  >
                    <Icon icon={icon} width={22} height={22} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" type="url" />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
