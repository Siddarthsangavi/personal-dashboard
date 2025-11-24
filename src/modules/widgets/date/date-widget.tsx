"use client";

import { useEffect, useState, useMemo } from "react";
import { WidgetRecord } from "@/modules/dashboard/types";
import styles from "./date-widget.module.scss";

interface DateWidgetProps {
  widget: WidgetRecord;
  setHeaderAction: (widgetId: number, action: React.ReactNode) => void;
}

export function DateWidget({ widget, setHeaderAction }: DateWidgetProps) {
  const [time, setTime] = useState(new Date());

  // Update time every minute (date changes less frequently)
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Clear header actions
  useEffect(() => {
    return () => setHeaderAction(widget.id, null);
  }, [widget.id, setHeaderAction]);

  // Format date as "Sunday, 23rd Nov"
  const dateStr = useMemo(() => {
    const day = time.getDate();
    const daySuffix = 
      day === 1 || day === 21 || day === 31 ? "st" :
      day === 2 || day === 22 ? "nd" :
      day === 3 || day === 23 ? "rd" : "th";
    
    const weekday = time.toLocaleDateString("en-US", { weekday: "long" });
    const month = time.toLocaleDateString("en-US", { month: "short" });
    
    return `${weekday}, ${day}${daySuffix} ${month}`;
  }, [time]);

  return (
    <div className={styles.dateWidget}>
      <div className={styles.date}>{dateStr}</div>
    </div>
  );
}

