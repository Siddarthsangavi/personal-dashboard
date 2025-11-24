"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { WidgetRecord } from "@/modules/dashboard/types";
import { settingsRepository } from "@/lib/db";
import styles from "./digital-clock-widget.module.scss";

interface DigitalClockWidgetProps {
  widget: WidgetRecord;
  setHeaderAction: (widgetId: number, action: React.ReactNode) => void;
}

export function DigitalClockWidget({ widget, setHeaderAction }: DigitalClockWidgetProps) {
  const [time, setTime] = useState(new Date());
  const [hourFormat, setHourFormat] = useState<"12" | "24">("24");
  const lastPositionRef = useRef<{ x: number; y: number }>({ x: widget.position.x, y: widget.position.y });
  const clickStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const savedFormat = await settingsRepository.get<"12" | "24">(
        `digital-clock_${widget.id}_hourFormat`
      );
      if (savedFormat) setHourFormat(savedFormat);
    };
    void loadSettings();
  }, [widget.id]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Save hour format when changed
  useEffect(() => {
    void settingsRepository.put(`digital-clock_${widget.id}_hourFormat`, hourFormat);
  }, [hourFormat, widget.id]);

  // Clear header actions
  useEffect(() => {
    return () => setHeaderAction(widget.id, null);
  }, [widget.id, setHeaderAction]);

  // Toggle format
  const toggleFormat = () => {
    setHourFormat((current) => (current === "12" ? "24" : "12"));
  };

  // Track position changes - if position changed, it was a drag, not a click
  useEffect(() => {
    const currentPos = { x: widget.position.x, y: widget.position.y };
    const lastPos = lastPositionRef.current;
    
    // If position changed and we have a pending click, cancel it
    if (clickStartPosRef.current && (currentPos.x !== lastPos.x || currentPos.y !== lastPos.y)) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      clickStartPosRef.current = null;
    }
    
    lastPositionRef.current = currentPos;
  }, [widget.position.x, widget.position.y]);

  // Handle mouse down - track click start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    // Store position at click start
    clickStartPosRef.current = { x: widget.position.x, y: widget.position.y };
    
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    // Set timeout to check if it was a click (no position change)
    clickTimeoutRef.current = setTimeout(() => {
      if (clickStartPosRef.current) {
        const startPos = clickStartPosRef.current;
        const currentPos = { x: widget.position.x, y: widget.position.y };
        
        // If position didn't change, it was a click
        if (startPos.x === currentPos.x && startPos.y === currentPos.y) {
          toggleFormat();
        }
        
        clickStartPosRef.current = null;
      }
      clickTimeoutRef.current = null;
    }, 250); // Wait 250ms for drag to complete
  };

  // Format time based on hour format
  const formattedTime = useMemo(() => {
    const hours = time.getHours();
    const minutes = time.getMinutes();

    if (hourFormat === "12") {
      const hours12 = hours % 12 || 12;
      return {
        hours: hours12.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
      };
    } else {
      return {
        hours: hours.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
      };
    }
  }, [time, hourFormat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.digitalClockWidget}>
      <div 
        className={styles.clickArea}
        onMouseDown={handleMouseDown}
      >
        <div className={styles.time}>
          {formattedTime.hours}:{formattedTime.minutes}
        </div>
      </div>
    </div>
  );
}

