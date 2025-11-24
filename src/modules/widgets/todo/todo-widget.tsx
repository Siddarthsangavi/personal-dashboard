"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import {
  todoRepository,
  type TodoRecord,
} from "@/lib/db";
import { WidgetRecord } from "@/modules/dashboard/types";
import styles from "./todo-widget.module.scss";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/core/icon-button";
import {
  Check,
  Plus,
  X,
  Square,
} from "lucide-react";

interface TodoWidgetProps {
  widget: WidgetRecord;
  setHeaderAction: (widgetId: number, action: React.ReactNode) => void;
}

export function TodoWidget({ widget }: TodoWidgetProps) {
  const [items, setItems] = useState<TodoRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    const collection = await todoRepository.list(widget.id);
    const ordered = collection.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setItems(ordered);
  }, [widget.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAdd = async () => {
    if (!draft.trim()) return;
    await todoRepository.create({
      widgetId: widget.id,
      text: draft.trim(),
      completed: false,
    });
    setDraft("");
    void refresh();
  };

  const handleDelete = async (item: TodoRecord) => {
    // Start removal animation
    setRemovingIds((prev) => new Set(prev).add(item.id));
    
    // Wait for animation to complete, then delete
    setTimeout(async () => {
      await todoRepository.remove(item.id);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      void refresh();
    }, 300); // Match animation duration
  };

  const startEditing = (item: TodoRecord) => {
    setEditingId(item.id);
    setEditingValue(item.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const commitEditing = async () => {
    if (editingId === null || !editingValue.trim()) return;
    await todoRepository.update(editingId, { text: editingValue.trim() });
    setEditingId(null);
    setEditingValue("");
    void refresh();
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitEditing();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  };

  const handleDraftEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleAdd();
    }
  };

  return (
    <div className={styles.todoWidget}>
      <div className={styles.composer}>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleDraftEnter}
          placeholder="Capture a new todo"
          className={styles.todoInput}
        />
        <IconButton
          icon={<Plus className="size-4" />}
          label="Add todo"
          onClick={() => void handleAdd()}
        />
      </div>
      <div className={styles.todoList}>
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`${styles.todoCard} ${removingIds.has(item.id) ? styles.removing : ''}`}
          >
            <IconButton
              icon={<Square className="size-4 text-muted-foreground" />}
              label="Delete todo"
              onClick={() => void handleDelete(item)}
            />
            <div className={styles.todoBody}>
              {editingId === item.id ? (
                <Input
                  value={editingValue}
                  onChange={(event) => setEditingValue(event.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={() => void commitEditing()}
                  autoFocus
                  className={styles.editInput}
                />
              ) : (
                <span
                  className={styles.todoText}
                  onClick={() => startEditing(item)}
                >
                  {item.text}
                </span>
              )}
            </div>
          </div>
        ))}
        {!items.length && (
          <p className={styles.emptyState}>
            Nothing on your list yet. Add a task to get started.
          </p>
        )}
      </div>
    </div>
  );
}

