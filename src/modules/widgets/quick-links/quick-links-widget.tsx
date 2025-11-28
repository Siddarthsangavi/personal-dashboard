"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  quickLinkRepository,
  type QuickLinkRecord,
} from "@/lib/db";
import { WidgetRecord } from "@/modules/dashboard/types";
import styles from "./quick-links-widget.module.scss";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface QuickLinksWidgetProps {
  widget: WidgetRecord;
  onRemove?: (widgetId: number) => void;
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

export function QuickLinksWidget({ widget, onRemove }: QuickLinksWidgetProps) {
  const [links, setLinks] = useState<QuickLinkRecord[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLinkRecord | null>(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [iconName, setIconName] = useState(curatedIcons[0]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconQuery, setIconQuery] = useState("");
  const [iconResults, setIconResults] = useState<string[]>(curatedIcons);
  const [pendingDelete, setPendingDelete] = useState<QuickLinkRecord | null>(
    null
  );
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [linkContextMenu, setLinkContextMenu] = useState<{ x: number; y: number; link: QuickLinkRecord } | null>(null);
  const linkContextMenuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const collection = await quickLinkRepository.list(widget.id);
    setLinks(
      collection.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    );
  }, [widget.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openModal = (link?: QuickLinkRecord) => {
    setEditingLink(link ?? null);
    setLabel(link?.label ?? "");
    setUrl(link?.url ?? "");
    setIconName(link?.icon ?? curatedIcons[0]);
    setShowIconPicker(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!url.trim()) return;
    if (editingLink) {
      await quickLinkRepository.update(editingLink.id, {
        label: label.trim() || editingLink.label,
        url: url.trim(),
        icon: iconName,
      });
    } else {
      await quickLinkRepository.create({
        widgetId: widget.id,
        label: label.trim() || "Link",
        url: url.trim(),
        icon: iconName,
      });
    }
    setModalOpen(false);
    setLabel("");
    setUrl("");
    setIconName(curatedIcons[0]);
    void refresh();
  };

  const confirmDelete = (link: QuickLinkRecord) => {
    setPendingDelete(link);
    setConfirmOpen(true);
    setLinkContextMenu(null); // Close context menu when opening delete dialog
  };

  const handleLinkContextMenu = (e: React.MouseEvent, link: QuickLinkRecord) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent widget context menu from showing
    setLinkContextMenu({ x: e.clientX, y: e.clientY, link });
  };

  useEffect(() => {
    if (!linkContextMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (linkContextMenuRef.current && !linkContextMenuRef.current.contains(event.target as Node)) {
        setLinkContextMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLinkContextMenu(null);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [linkContextMenu]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await quickLinkRepository.remove(pendingDelete.id);
    setPendingDelete(null);
    setConfirmOpen(false);
    void refresh();
  };

  useEffect(() => {
    if (!iconQuery.trim()) {
      setIconResults(curatedIcons);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/icons?q=${encodeURIComponent(iconQuery.trim())}`,
          { signal: controller.signal }
        );
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

  // Calculate max icons based on widget area (width * height)
  // e.g., 5x1 = 5 icons, 2x2 = 4 icons, 3x2 = 6 icons
  // Use useMemo to ensure immediate updates during resize
  // IMPORTANT: Must be called before any early returns to follow Rules of Hooks
  const maxIcons = useMemo(
    () => widget.size.w * widget.size.h,
    [widget.size.w, widget.size.h]
  );
  const shouldShowAddButton = links.length < maxIcons;
  
  // Only display icons up to the current max capacity
  // Memoize to ensure immediate updates during resize
  const displayedLinks = useMemo(
    () => links.slice(0, maxIcons),
    [links, maxIcons]
  );

  // When empty, show only a "+" button that fills the widget
  if (links.length === 0) {
    return (
      <>
        <div className={styles.linksWidget} style={{ padding: 0 }}>
          <div 
            className={styles.linksGrid}
            style={{
              gridTemplateColumns: `repeat(${widget.size.w}, minmax(40px, 1fr))`,
              gridTemplateRows: `repeat(${widget.size.h}, minmax(40px, 1fr))`,
            }}
          >
            <button
              className={styles.emptyAddButton}
              onClick={() => openModal()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Plus className="size-6" />
            </button>
          </div>
        </div>

        <Dialog
          open={isModalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) {
              setShowIconPicker(false);
              setIconQuery("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New quick link</DialogTitle>
              <DialogDescription>
                Select an icon and paste the destination URL.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border p-3">
                  <Icon icon={iconName} width={32} height={32} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIconPicker((prev) => !prev)}
                >
                  {showIconPicker ? "Hide icons" : "Change icon"}
                </Button>
              </div>
              {showIconPicker && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={iconQuery}
                      onChange={(event) => setIconQuery(event.target.value)}
                      placeholder="Search icons"
                      className="pl-9"
                    />
                  </div>
                  <div className={styles.iconPicker}>
                    {iconResults.map((icon) => (
                      <button
                        key={icon}
                        className={cn(
                          styles.iconChoice,
                          icon === iconName && styles.isActive
                        )}
                        onClick={() => setIconName(icon)}
                      >
                        <Icon icon={icon} width={22} height={22} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Label"
              />
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // When populated, show icons in a grid
  return (
    <>
      <div className={styles.linksWidget} style={{ padding: 0 }}>
        <div 
          className={styles.linksGrid}
          style={{
            gridTemplateColumns: `repeat(${widget.size.w}, minmax(40px, 1fr))`,
            gridTemplateRows: `repeat(${widget.size.h}, minmax(40px, 1fr))`,
          }}
        >
          {displayedLinks.map((link) => (
            <div key={link.id} className={styles.linkTile}>
              <button
                className={styles.linkButton}
                onClick={() => window.open(link.url, "_blank")}
                onContextMenu={(e) => handleLinkContextMenu(e, link)}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label={`Open ${link.label}`}
              >
                <Icon icon={link.icon} width={36} height={36} />
              </button>
            </div>
          ))}
          {shouldShowAddButton && (
            <button
              className={`${styles.linkTile} ${styles.addTile}`}
              onClick={() => openModal()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setShowIconPicker(false);
            setIconQuery("");
          }
        }}
      >
        <DialogContent onEnter={() => void handleSave()}>
          <DialogHeader>
            <DialogTitle>
              {editingLink ? "Edit quick link" : "New quick link"}
            </DialogTitle>
            <DialogDescription>
              Select an icon and paste the destination URL.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border p-3">
                <Icon icon={iconName} width={32} height={32} />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIconPicker((prev) => !prev)}
              >
                {showIconPicker ? "Hide icons" : "Change icon"}
              </Button>
            </div>
            {showIconPicker && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={iconQuery}
                    onChange={(event) => setIconQuery(event.target.value)}
                    placeholder="Search icons"
                    className="pl-9"
                  />
                </div>
                <div className={styles.iconPicker}>
                  {iconResults.map((icon) => (
                    <button
                      key={icon}
                      className={cn(
                        styles.iconChoice,
                        icon === iconName && styles.isActive
                      )}
                      onClick={() => setIconName(icon)}
                    >
                      <Icon icon={icon} width={22} height={22} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Label"
            />
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              type="url"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onEnter={() => void handleDelete()}>
          <DialogHeader>
            <DialogTitle>Remove quick link?</DialogTitle>
            <DialogDescription>
              This shortcut will be removed from your widget.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => void handleDelete()}
              className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Context Menu */}
      {linkContextMenu && typeof window !== "undefined" && document.body && createPortal(
        <div
          ref={linkContextMenuRef}
          className="fixed z-[9999] w-48 rounded-xl border border-border/70 bg-card p-2 shadow-2xl"
          style={{
            left: `${linkContextMenu.x}px`,
            top: `${linkContextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              confirmDelete(linkContextMenu.link);
            }}
          >
            <Trash2 className="size-4" />
            Delete Link
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
