"use client";

import { useEffect, useState } from "react";
import { WidgetRecord } from "@/modules/dashboard/types";
import styles from "./analog-clock-widget.module.scss";

interface AnalogClockWidgetProps {
  widget: WidgetRecord;
  setHeaderAction: (widgetId: number, action: React.ReactNode) => void;
}

export function AnalogClockWidget({ widget, setHeaderAction }: AnalogClockWidgetProps) {
  const [time, setTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Clear header actions
  useEffect(() => {
    return () => setHeaderAction(widget.id, null);
  }, [widget.id, setHeaderAction]);

  // Analog clock calculations
  const hourAngle = (time.getHours() % 12) * 30 + time.getMinutes() * 0.5;
  const minuteAngle = time.getMinutes() * 6;
  const secondAngle = time.getSeconds() * 6;

  return (
    <div className={styles.analogClockWidget}>
      <div className={styles.analogClock}>
        <svg viewBox="0 0 100 100" className={styles.clockFace}>
          <circle cx="50" cy="50" r="48" className={styles.clockCircle} />
          {/* Hour markers */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x1 = 50 + 40 * Math.cos(angle);
            const y1 = 50 + 40 * Math.sin(angle);
            const x2 = 50 + 45 * Math.cos(angle);
            const y2 = 50 + 45 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={styles.hourMarker}
                strokeWidth={i % 3 === 0 ? 2 : 1}
              />
            );
          })}
          {/* Hour hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + 25 * Math.cos(((hourAngle - 90) * Math.PI) / 180)}
            y2={50 + 25 * Math.sin(((hourAngle - 90) * Math.PI) / 180)}
            className={styles.hourHand}
            strokeWidth="3"
          />
          {/* Minute hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + 35 * Math.cos(((minuteAngle - 90) * Math.PI) / 180)}
            y2={50 + 35 * Math.sin(((minuteAngle - 90) * Math.PI) / 180)}
            className={styles.minuteHand}
            strokeWidth="2"
          />
          {/* Second hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + 38 * Math.cos(((secondAngle - 90) * Math.PI) / 180)}
            y2={50 + 38 * Math.sin(((secondAngle - 90) * Math.PI) / 180)}
            className={styles.secondHand}
            strokeWidth="1"
          />
          <circle cx="50" cy="50" r="3" className={styles.clockCenter} />
        </svg>
      </div>
    </div>
  );
}

