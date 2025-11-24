"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  noteRepository,
  type NoteRecord,
} from "@/lib/db";
import { WidgetRecord } from "@/modules/dashboard/types";
import styles from "./notes-widget.module.scss";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IconButton } from "@/components/core/icon-button";
import {
  FilePenLine,
  Plus,
  Trash2,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NotesWidgetProps {
  widget: WidgetRecord;
  setHeaderActions?: (actions: ReactNode | null) => void;
}

export function NotesWidget({ widget, setHeaderActions }: NotesWidgetProps) {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [query, setQuery] = useState("");
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [editingNote, setEditingNote] = useState<NoteRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NoteRecord | null>(null);

  const refresh = useCallback(async () => {
    const collection = await noteRepository.list(widget.id);
    const ordered = collection.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setNotes(ordered);
  }, [widget.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openComposer = useCallback((note?: NoteRecord) => {
    setEditingNote(note ?? null);
    setDraftTitle(note?.title ?? "");
    setDraftBody(note?.body ?? "");
    setComposerOpen(true);
  }, []);

  useEffect(() => {
    if (!setHeaderActions) return;
    setHeaderActions(
      <IconButton
        icon={<Plus className="size-4" />}
        label="Add note"
        onClick={() => openComposer()}
      />
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, openComposer]);

  const resetComposer = () => {
    setEditingNote(null);
    setDraftTitle("");
    setDraftBody("");
  };

  const handleSaveNote = async () => {
    if (!draftTitle.trim() && !draftBody.trim()) return;
    if (editingNote) {
      await noteRepository.update(editingNote.id, {
        title: draftTitle.trim(),
        body: draftBody.trim(),
      });
    } else {
      await noteRepository.create({
        widgetId: widget.id,
        title: draftTitle.trim() || "Untitled",
        body: draftBody.trim(),
      });
    }
    setComposerOpen(false);
    resetComposer();
    void refresh();
  };

  const confirmDelete = (note: NoteRecord) => {
    setPendingDelete(note);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await noteRepository.remove(pendingDelete.id);
    setPendingDelete(null);
    setConfirmOpen(false);
    void refresh();
  };

  const filteredNotes = useMemo(() => {
    if (!query.trim()) return notes;
    const lower = query.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(lower) ||
        note.body.toLowerCase().includes(lower)
    );
  }, [notes, query]);

  return (
    <div className={styles.notesWidget}>
      {notes.length >= 10 && (
        <div className={styles.notesToolbar}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search notes"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${styles.searchInput} pl-9`}
            />
          </div>
        </div>
      )}

      <div className={styles.noteGrid}>
        {notes.length === 0 ? (
          <button
            className={`${styles.noteCard} ${styles.addCard}`}
            onClick={() => openComposer()}
          >
            <Plus className="size-4" />
          </button>
        ) : (
          filteredNotes.map((note) => (
            <article key={note.id} className={styles.noteCard}>
              <div className={styles.cardActions}>
                <IconButton
                  icon={<FilePenLine className="size-4" />}
                  label="Edit note"
                  onClick={() => openComposer(note)}
                />
                <IconButton
                  icon={<Trash2 className="size-4" />}
                  label="Delete note"
                  onClick={() => confirmDelete(note)}
                />
              </div>
              <h3 className={styles.noteTitle}>{note.title}</h3>
              <div className={styles.noteMeta}>
                {new Date(note.updatedAt).toLocaleDateString()}
              </div>
            </article>
          ))
        )}
      </div>

      <Dialog
        open={isComposerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open) resetComposer();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Edit note" : "New note"}
            </DialogTitle>
            <DialogDescription>
              {editingNote
                ? "Update the content and save your note."
                : "Add a title and body, then save when ready."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Title"
            />
            <Textarea
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              placeholder="Note content"
              className="min-h-32"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveNote()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete note?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The note will be removed from your
              dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

