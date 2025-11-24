"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WidgetRecord } from "@/modules/dashboard/types";
import styles from "./pomodoro-widget.module.scss";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PomodoroWidgetProps {
  widget: WidgetRecord;
  setHeaderAction: (widgetId: number, action: React.ReactNode) => void;
}

const DEFAULT_TIME = 30 * 60; // 30 minutes in seconds

export function PomodoroWidget({ widget }: PomodoroWidgetProps) {
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [hours, setHours] = useState(0); // Default 0 hours
  const [minutes, setMinutes] = useState(30); // Default 30 minutes
  const [initialTime, setInitialTime] = useState(DEFAULT_TIME);
  const [isEditing, setIsEditing] = useState(false);
  const [editHours, setEditHours] = useState("0");
  const [editMinutes, setEditMinutes] = useState("30");
  const editHoursRef = useRef<HTMLInputElement>(null);
  const editMinutesRef = useRef<HTMLInputElement>(null);

  // Update timer when hours or minutes change (only when not running)
  useEffect(() => {
    if (!isRunning && !isEditing) {
      const totalMinutes = hours * 60 + Math.max(0, Math.min(59, minutes));
      const newTime = Math.max(60, totalMinutes * 60); // Minimum 1 minute (60 seconds)
      setInitialTime(newTime);
      setTimeLeft(newTime);
    }
  }, [hours, minutes, isRunning, isEditing]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handleStartPause = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(initialTime);
  }, [initialTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    // Always show HH:MM format
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const progress = initialTime > 0 ? ((initialTime - timeLeft) / initialTime) * 100 : 0;

  const handleTimeClick = (e: React.MouseEvent) => {
    if (!isRunning && !isEditing) {
      e.stopPropagation();
      setIsEditing(true);
      const currentHours = Math.floor(timeLeft / 3600);
      const currentMins = Math.floor((timeLeft % 3600) / 60);
      setEditHours(currentHours.toString());
      setEditMinutes(currentMins.toString().padStart(2, "0"));
    }
  };

  const handleTimeSave = (e?: React.FocusEvent<HTMLInputElement>) => {
    // Don't save if focus is moving to the other input
    if (e?.relatedTarget) {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (relatedTarget.classList.contains(styles.timeInput)) {
        return; // Focus is moving to another time input, don't save yet
      }
    }
    
    const hrs = parseInt(editHours, 10) || 0;
    const mins = parseInt(editMinutes, 10) || 0;
    if (hrs >= 0 && hrs <= 23 && mins >= 0 && mins <= 59) {
      setHours(hrs);
      setMinutes(mins);
      const totalMinutes = hrs * 60 + mins;
      const newTime = Math.max(60, totalMinutes * 60);
      setInitialTime(newTime);
      setTimeLeft(newTime);
    }
    setIsEditing(false);
  };

  const handleTimeCancel = () => {
    setIsEditing(false);
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTimeSave();
    } else if (e.key === "Escape") {
      handleTimeCancel();
    }
  };

  // Focus hours input when editing starts
  useEffect(() => {
    if (isEditing && editHoursRef.current) {
      editHoursRef.current.focus();
      editHoursRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className={styles.pomodoroWidget}>
      <div className={styles.contentWrapper}>
        <div className={styles.circleSection}>
          <div className={styles.timerContainer}>
            <div className={styles.progressRing}>
              <svg className={styles.progressSvg} viewBox="0 0 100 100">
                <circle
                  className={styles.progressBackground}
                  cx="50"
                  cy="50"
                  r="42"
                />
                <circle
                  className={styles.progressBarCircle}
                  cx="50"
                  cy="50"
                  r="42"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                />
              </svg>
              <div className={styles.timerDisplay} onClick={handleTimeClick}>
                {isEditing ? (
                  <div 
                    className={styles.timeEdit} 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <input
                      ref={editHoursRef}
                      type="text"
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      onBlur={(e) => handleTimeSave(e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault();
                          editMinutesRef.current?.focus();
                          editMinutesRef.current?.select();
                        } else if (e.key === "Escape") {
                          handleTimeCancel();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={styles.timeInput}
                      maxLength={2}
                      placeholder="0"
                    />
                    <span className={styles.timeSeparator}>:</span>
                    <input
                      ref={editMinutesRef}
                      type="text"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      onBlur={(e) => handleTimeSave(e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleTimeSave();
                        } else if (e.key === "Escape") {
                          handleTimeCancel();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={styles.timeInput}
                      maxLength={2}
                      placeholder="30"
                    />
                  </div>
                ) : (
                  <div className={styles.time}>{formatTime(timeLeft)}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.controlsSection}>
          <Button
            onClick={handleStartPause}
            className={styles.controlButton}
            variant="default"
            size="sm"
            disabled={isEditing}
          >
            {isRunning ? (
              <>
                <Pause className="size-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="size-4" />
                <span>Start</span>
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            className={styles.controlButton}
            variant="outline"
            size="sm"
            disabled={isEditing || isRunning}
          >
            <RotateCcw className="size-3" />
            <span>Reset</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

