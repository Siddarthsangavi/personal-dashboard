import { useEffect, useRef } from "react";
import { useDashboardStore } from "../store/dashboard-store";
import { useToast } from "@/components/ui/toast";

export function useKeyboardShortcuts(onShowShortcuts?: () => void) {
  const removeWidget = useDashboardStore((state) => state.removeWidget);
  const duplicateWidget = useDashboardStore((state) => state.duplicateWidget);
  const widgets = useDashboardStore((state) => state.widgets);
  const currentPage = useDashboardStore((state) => state.currentPage);
  const getPageWidgets = useDashboardStore((state) => state.getPageWidgets);
  const { showToast } = useToast();
  const onShowShortcutsRef = useRef(onShowShortcuts);

  useEffect(() => {
    onShowShortcutsRef.current = onShowShortcuts;
  }, [onShowShortcuts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd + K: Show keyboard shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        onShowShortcutsRef.current?.();
      }

      // Delete/Backspace: Remove last widget on current page
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        const pageWidgets = getPageWidgets(currentPage);
        if (pageWidgets.length > 0) {
          const lastWidget = pageWidgets[pageWidgets.length - 1];
          void removeWidget(lastWidget.id);
          showToast("Widget removed", "success");
        }
      }

      // Ctrl/Cmd + D: Duplicate last widget
      if ((event.ctrlKey || event.metaKey) && event.key === "d") {
        event.preventDefault();
        const pageWidgets = getPageWidgets(currentPage);
        if (pageWidgets.length > 0) {
          const lastWidget = pageWidgets[pageWidgets.length - 1];
          void duplicateWidget(lastWidget.id);
          showToast("Widget duplicated", "success");
        }
      }

      // Ctrl/Cmd + N: New page
      if ((event.ctrlKey || event.metaKey) && event.key === "n") {
        event.preventDefault();
        const availablePages = new Set(widgets.map((w) => w.pageId));
        const maxPage = Math.max(...availablePages, 1);
        useDashboardStore.getState().setCurrentPage(maxPage + 1);
        showToast("New page created", "success");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    widgets,
    currentPage,
    getPageWidgets,
    removeWidget,
    duplicateWidget,
    showToast,
  ]);
}

