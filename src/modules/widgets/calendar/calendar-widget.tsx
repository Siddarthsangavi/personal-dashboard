"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { WidgetRecord } from "@/modules/dashboard/types";
import styles from "./calendar-widget.module.scss";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/core/icon-button";

interface CalendarWidgetProps {
  widget: WidgetRecord;
  setHeaderAction: (widgetId: number, action: React.ReactNode) => void;
}

export function CalendarWidget({ widget, setHeaderAction }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long" });
  const today = new Date();

  const days = useMemo(() => {
    const daysArray: (number | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      daysArray.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(day);
    }
    
    // Pad to ensure we always have 6 weeks (42 cells) for consistent layout
    const totalCells = daysArray.length;
    const weeks = Math.ceil(totalCells / 7);
    const cellsNeeded = weeks * 7;
    const remainingCells = cellsNeeded - totalCells;
    
    // If we have less than 6 weeks, pad with empty cells
    if (weeks < 6) {
      for (let i = 0; i < remainingCells; i++) {
        daysArray.push(null);
      }
    }
    
    return daysArray;
  }, [startingDayOfWeek, daysInMonth]);

  const isToday = (day: number | null) => {
    if (day === null) return false;
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);


  // Clear header actions on unmount
  useEffect(() => {
    return () => setHeaderAction(widget.id, null);
  }, [widget.id, setHeaderAction]);

  return (
    <div className={styles.calendarWidget}>
      <div className={styles.header}>
        <div className={styles.monthYear}>
          {monthName} {year}
        </div>
        <div 
          className={styles.navigation}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <IconButton
            icon={<ChevronLeft className="size-4" />}
            label="Previous month"
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousMonth();
            }}
            className="text-muted-foreground hover:text-foreground"
          />
          <IconButton
            icon={<ChevronRight className="size-4" />}
            label="Next month"
            onClick={(e) => {
              e.stopPropagation();
              goToNextMonth();
            }}
            className="text-muted-foreground hover:text-foreground"
          />
        </div>
      </div>
      <div className={styles.weekdays}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className={styles.weekday}>
            {day}
          </div>
        ))}
      </div>
      <div className={styles.days}>
        {days.map((day, index) => (
          <div
            key={`${year}-${month}-${index}`}
            className={`${styles.day} ${day === null ? styles.empty : ""} ${
              isToday(day) ? styles.today : ""
            }`}
          >
            <span>{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

