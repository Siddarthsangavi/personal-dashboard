export type WidgetType = "todo" | "notes" | "quick-links" | "analog-clock" | "date" | "digital-clock" | "weather" | "calendar" | "pomodoro" | "scratchpad";

export type SurfaceStyle = "default" | "glass" | "neumorphic";

export interface GridPosition {
  x: number;
  y: number;
}

export interface GridSize {
  w: number;
  h: number;
}

export interface WidgetRecord {
  id: number;
  type: WidgetType;
  title: string;
  position: GridPosition;
  size: GridSize;
  minSize: GridSize;
  surface: SurfaceStyle;
  isLocked: boolean;
  pageId: number;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetDefinition {
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
  defaultSize: GridSize;
  minSize: GridSize;
}

export const GRID_SETTINGS = {
  columns: 16,
  rowHeight: 110,
  gap: 16,
  minColumnWidth: 120,
  maxColumnWidth: 180,
} as const;

export const widgetCatalog: Record<WidgetType, WidgetDefinition> = {
  "todo": {
    type: "todo",
    title: "Todo",
    description: "Capture quick action items and mark them done.",
    icon: "CheckSquare",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 3 },
  },
  "notes": {
    type: "notes",
    title: "Notes",
    description: "Drop rich notes with titles and fast search.",
    icon: "NotebookPen",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 3 },
  },
  "quick-links": {
    type: "quick-links",
    title: "Quick Links",
    description: "One-tap launchers to the destinations you use daily.",
    icon: "Link2",
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
  },
  "analog-clock": {
    type: "analog-clock",
    title: "Analog Clock",
    description: "Classic analog clock display.",
    icon: "Clock",
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  "date": {
    type: "date",
    title: "Date",
    description: "Current date display.",
    icon: "Calendar",
    defaultSize: { w: 3, h: 1 },
    minSize: { w: 3, h: 1 },
  },
  "digital-clock": {
    type: "digital-clock",
    title: "Digital Clock",
    description: "Digital time display with format toggle.",
    icon: "Watch",
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
  },
  "weather": {
    type: "weather",
    title: "Weather",
    description: "Current weather conditions and forecast.",
    icon: "Cloud",
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 3, h: 4 },
  },
  "calendar": {
    type: "calendar",
    title: "Calendar",
    description: "Monthly calendar view with events.",
    icon: "Calendar",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 4, h: 5 },
  },
  "pomodoro": {
    type: "pomodoro",
    title: "Pomodoro Timer",
    description: "Focus timer using the Pomodoro technique.",
    icon: "Timer",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 4, h: 3 },
  },
  "scratchpad": {
    type: "scratchpad",
    title: "Scratchpad",
    description: "A simple text area to write anything you want.",
    icon: "FileText",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 3, h: 2 },
  },
};

