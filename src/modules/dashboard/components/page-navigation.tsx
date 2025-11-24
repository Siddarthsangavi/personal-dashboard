"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useDashboardStore } from "../store/dashboard-store";

export function PageNavigation() {
  const currentPage = useDashboardStore((state) => state.currentPage);
  const setCurrentPage = useDashboardStore((state) => state.setCurrentPage);
  const widgets = useDashboardStore((state) => state.widgets);
  
  const availablePages = useMemo(() => {
    const pages = new Set(widgets.map((w) => w.pageId));
    return Array.from(pages).sort((a, b) => a - b);
  }, [widgets]);
  
  const maxPage = useMemo(() => {
    const maxPageWithWidgets = availablePages.length > 0 ? Math.max(...availablePages) : 0;
    // maxPage should be at least the current page (in case current page has no widgets yet)
    return Math.max(maxPageWithWidgets, currentPage, 1);
  }, [availablePages, currentPage]);

  const goToPage = (page: number) => {
    // Only allow navigation to existing pages (pages that have widgets)
    // Or allow page 1 if no pages exist yet
    if (availablePages.length === 0 && page === 1) {
      void setCurrentPage(page);
    } else if (availablePages.includes(page)) {
      void setCurrentPage(page);
    }
  };

  const createNewPage = () => {
    void setCurrentPage(maxPage + 1);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/80 px-3 py-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-7 w-7"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <div className="flex items-center gap-1 px-2">
        <span className="text-sm font-medium">
          Page {currentPage} of {maxPage}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToPage(currentPage + 1)}
        disabled={!availablePages.includes(currentPage + 1)}
        className="h-7 w-7"
      >
        <ChevronRight className="size-4" />
      </Button>
      {currentPage === maxPage && (
        <Button
          variant="ghost"
          size="icon"
          onClick={createNewPage}
          className="ml-2 h-7 w-7"
          title="Create new page"
        >
          <Plus className="size-4" />
        </Button>
      )}
    </div>
  );
}

