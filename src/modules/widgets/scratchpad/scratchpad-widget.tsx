"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState, useRef } from "react";
import {
  scratchpadRepository,
  type ScratchpadRecord,
} from "@/lib/db";
import { WidgetRecord } from "@/modules/dashboard/types";
import styles from "./scratchpad-widget.module.scss";
import { Textarea } from "@/components/ui/textarea";

interface ScratchpadWidgetProps {
  widget: WidgetRecord;
}

export function ScratchpadWidget({ widget }: ScratchpadWidgetProps) {
  const [content, setContent] = useState("");
  const [scratchpad, setScratchpad] = useState<ScratchpadRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadScratchpad = useCallback(async () => {
    const records = await scratchpadRepository.list(widget.id);
    if (records.length > 0) {
      const record = records[0];
      setScratchpad(record);
      setContent(record.content);
    } else {
      // Create a new scratchpad if none exists
      const newRecord = await scratchpadRepository.create({
        widgetId: widget.id,
        content: "",
      });
      if (newRecord) {
        setScratchpad(newRecord);
      }
    }
  }, [widget.id]);

  useEffect(() => {
    void loadScratchpad();
  }, [loadScratchpad]);

  const saveContent = useCallback(async (newContent: string) => {
    if (!scratchpad) return;
    
    setIsSaving(true);
    try {
      await scratchpadRepository.update(scratchpad.id, {
        content: newContent,
      });
      // Update local scratchpad state
      setScratchpad((prev) => 
        prev ? { ...prev, content: newContent, updatedAt: new Date().toISOString() } : null
      );
    } catch (error) {
      console.error("Failed to save scratchpad:", error);
    } finally {
      setIsSaving(false);
    }
  }, [scratchpad]);

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setContent(newContent);

    // Debounce save - save after 500ms of no typing
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void saveContent(newContent);
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.scratchpadWidget}>
      <Textarea
        value={content}
        onChange={handleContentChange}
        placeholder="Write anything here..."
        className={styles.scratchpadTextarea}
        disabled={!scratchpad}
      />
      {isSaving && (
        <div className={styles.savingIndicator}>
          Saving...
        </div>
      )}
    </div>
  );
}

