"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { quickLinkRepository, type QuickLinkRecord } from "@/lib/db";
import { WidgetRecord } from "@/modules/dashboard/types";
import styles from "./bookmark-widget.module.scss";
import { Icon } from "@iconify/react";
import { Plus } from "lucide-react";
import { LinkEditorDialog } from "../quick-links/link-editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/modules/dashboard/store/dashboard-store";

interface BookmarkWidgetProps {
  widget: WidgetRecord;
  onRemove?: (id: number) => void;
}

export function BookmarkWidget({ widget }: BookmarkWidgetProps) {
  const [records, setRecords] = useState<QuickLinkRecord[]>([]);
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<QuickLinkRecord | null>(null);
  const [itemContext, setItemContext] = useState<{ x: number; y: number; record: QuickLinkRecord } | null>(null);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const contextRef = useRef<HTMLDivElement | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);

  const refresh = useCallback(async () => {
    const items = await quickLinkRepository.list(widget.id);
    setRecords(items ?? []);
  }, [widget.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Refresh when quicklinks change externally (e.g., merged into this widget)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce?.detail?.widgetId === widget.id) {
        void refresh();
      }
    };
    window.addEventListener('quicklinks-updated', handler as EventListener);
    return () => window.removeEventListener('quicklinks-updated', handler as EventListener);
  }, [widget.id, refresh]);

  // Close per-item context menu on outside click or Escape
  useEffect(() => {
    if (!itemContext) return;
    const handleOutside = () => setItemContext(null);
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setItemContext(null); };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [itemContext]);

  const handleSave = async (values: { label: string; url: string; icon: string }) => {
    if (!values.url.trim()) return;
    if (records.length > 0) {
      // update the first record by default when editing from widget
      const r = records[0];
      await quickLinkRepository.update(r.id, { label: values.label || r.label, url: values.url, icon: values.icon });
    } else {
      await quickLinkRepository.create({ widgetId: widget.id, label: values.label || "Link", url: values.url, icon: values.icon });
    }
    void refresh();
  };

  const handleDelete = async () => {
    // remove all quicklinks associated with this widget before widget removal
    const items = await quickLinkRepository.list(widget.id);
    await Promise.all(items.map((it) => quickLinkRepository.remove(it.id)));
    setConfirmOpen(false);
    void refresh();
  };

  // listen for global edit event coming from WidgetContextMenu
  useEffect(() => {
    const handler = async (e: Event) => {
      const ce = e as CustomEvent;
      if (ce?.detail?.widgetId === widget.id) {
        try {
          const items = await quickLinkRepository.list(widget.id);
          const isFolder = (items ?? []).length > 1;
          if (isFolder) {
            setTitleInput(widget.title ?? "");
            setTitleEditorOpen(true);
          } else {
            setEditorOpen(true);
          }
        } catch (err) {
          setEditorOpen(true);
        }
      }
    };
    window.addEventListener("widget-edit", handler as EventListener);
    return () => window.removeEventListener("widget-edit", handler as EventListener);
  }, [widget.id]);

  const [titleEditorOpen, setTitleEditorOpen] = useState(false);
  const [titleInput, setTitleInput] = useState<string>(widget.title ?? "");

  const saveTitle = async () => {
    const trimmed = (titleInput ?? "").trim();
    try {
      await (await import("@/lib/db")).widgetRepository.update(widget.id, { title: trimmed });
      // Refresh dashboard widgets
      await useDashboardStore.getState().hydrate();
    } catch (err) {
      console.error(err);
    }
    setTitleEditorOpen(false);
  };

  if (records.length === 0) {
    return (
      <div className={styles.bookmarkWidget}>
        <div className={styles.emptyAdd}>
          <button
            className={styles.tile}
            onClick={() => setEditorOpen(true)}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label="Add bookmark"
          >
            <Plus />
          </button>
        </div>

        <LinkEditorDialog
          open={isEditorOpen}
          onOpenChange={setEditorOpen}
          onSave={async (values) => await handleSave(values)}
          title="New bookmark"
        />
      </div>
    );
  }
  // When multiple records exist, render a mini grid inside the 2x2 tile
  const recordsToShow = records.slice(0, 4);

  return (
    <>
      <div className={styles.bookmarkWidget}>
        <div
          className={styles.tile}
          onContextMenu={(e) => { e.stopPropagation(); /* allow WidgetFrame to open widget-level menu */ }}
          onClick={(e) => { e.stopPropagation(); if (records.length === 1) window.open(records[0].url, '_blank'); else setFolderOpen(true); }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          role="button"
          aria-label={records[0] ? `Open ${records[0].label}` : 'Bookmark'}
        >
          {records.length === 1 ? (
            <>
              <div className={styles.iconWrapper}>
                <Icon icon={records[0].icon} width={36} height={36} />
              </div>
              <div className={styles.label}>{records[0].label}</div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {recordsToShow.map((r) => (
                <div key={r.id} className="p-1 flex items-center justify-center">
                  <Icon icon={r.icon} width={20} height={20} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LinkEditorDialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditingRecord(null);
        }}
        initial={editingRecord ? { label: editingRecord.label, url: editingRecord.url, icon: editingRecord.icon } : (records[0] ? { label: records[0].label, url: records[0].url, icon: records[0].icon } : undefined)}
        onSave={async (values) => {
          if (editingRecord) {
            await quickLinkRepository.update(editingRecord.id, { label: values.label || editingRecord.label, url: values.url, icon: values.icon });
          } else if (records.length > 0) {
            const r = records[0];
            await quickLinkRepository.update(r.id, { label: values.label || r.label, url: values.url, icon: values.icon });
          } else {
            await quickLinkRepository.create({ widgetId: widget.id, label: values.label || "Link", url: values.url, icon: values.icon });
          }
          setEditingRecord(null);
          void refresh();
        }}
        title={records.length > 0 ? "Edit bookmark" : "New bookmark"}
      />
        {/* Folder dialog */}
        <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{widget.title || 'Folder'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border relative"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setItemContext({ x: e.clientX, y: e.clientY, record: r });
                  }}
                >
                  <button className="p-2" onClick={() => window.open(r.url, '_blank')}>
                    <Icon icon={r.icon} width={28} height={28} />
                  </button>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.url}</div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      {itemContext && (
        <div
          className="fixed z-[9999] w-44 rounded-xl border border-border/70 bg-card p-2 shadow-2xl"
          style={{ left: itemContext.x, top: itemContext.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-2">
            <button
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-accent hover:bg-accent-2"
              onClick={async (e) => {
                e.stopPropagation();
                setEditingRecord(itemContext.record);
                setEditorOpen(true);
                setItemContext(null);
              }}
            >
              Edit
            </button>

            <button
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await quickLinkRepository.remove(itemContext.record.id);
                } catch (err) {
                  console.error(err);
                }
                setItemContext(null);
                void refresh();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
      <Dialog open={titleEditorOpen} onOpenChange={setTitleEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folder title</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} placeholder="Folder title" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTitleEditorOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveTitle()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
