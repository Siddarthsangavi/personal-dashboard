"use client";

import { type ReactNode, useMemo } from "react";
import { WidgetRecord } from "@/modules/dashboard/types";
import { TodoWidget } from "./todo/todo-widget";
import { NotesWidget } from "./notes/notes-widget";
import { QuickLinksWidget } from "./quick-links/quick-links-widget";
import { AnalogClockWidget } from "./analog-clock/analog-clock-widget";
import { DateWidget } from "./date/date-widget";
import { DigitalClockWidget } from "./digital-clock/digital-clock-widget";
import { WeatherWidget } from "./weather/weather-widget";
import { CalendarWidget } from "./calendar/calendar-widget";
import { PomodoroWidget } from "./pomodoro/pomodoro-widget";
import { ScratchpadWidget } from "./scratchpad/scratchpad-widget";
import { BookmarkWidget } from "./bookmark/bookmark-widget";

interface WidgetRendererProps {
  widget: WidgetRecord;
  setHeaderActions?: (actions: ReactNode | null) => void;
  onRemove?: (widgetId: number) => void;
}

export function WidgetRenderer({
  widget,
  setHeaderActions,
  onRemove,
}: WidgetRendererProps) {
  // Adapter function to convert setHeaderActions (plural) to setHeaderAction (singular) format
  // Some widgets expect: (widgetId: number, action: ReactNode) => void
  const setHeaderAction = useMemo(() => {
    if (!setHeaderActions) return undefined;
    return (widgetId: number, action: ReactNode) => {
      if (widgetId === widget.id) {
        setHeaderActions(action);
      }
    };
  }, [setHeaderActions, widget.id]);

  switch (widget.type) {
    case "todo":
      return <TodoWidget widget={widget} setHeaderAction={setHeaderAction || (() => {})} />;
    case "notes":
      return (
        <NotesWidget widget={widget} setHeaderActions={setHeaderActions} />
      );
    case "quick-links":
      return <QuickLinksWidget widget={widget} onRemove={onRemove} />;
    case "bookmark":
      return <BookmarkWidget widget={widget} onRemove={onRemove} />;
    case "analog-clock":
      return <AnalogClockWidget widget={widget} setHeaderAction={setHeaderAction || (() => {})} />;
    case "date":
      return <DateWidget widget={widget} setHeaderAction={setHeaderAction || (() => {})} />;
    case "digital-clock":
      return <DigitalClockWidget widget={widget} setHeaderAction={setHeaderAction || (() => {})} />;
    case "weather":
      return <WeatherWidget widget={widget} setHeaderAction={setHeaderAction || (() => {})} />;
    case "calendar":
      return <CalendarWidget widget={widget} setHeaderAction={setHeaderAction || (() => {})} />;
    case "pomodoro":
      return <PomodoroWidget widget={widget} setHeaderAction={setHeaderAction || (() => {})} />;
    case "scratchpad":
      return <ScratchpadWidget widget={widget} />;
    /* removed old 'bookmarks' widget (plural) */
    default:
      return (
        <div className="text-sm text-muted-foreground">
          Unsupported widget type.
        </div>
      );
  }
}

