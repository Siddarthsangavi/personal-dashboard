"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, Trash2, File, ChevronRight, ChevronDown, Folder, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  pageRepository,
  type PageRecord,
} from "@/lib/db";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "./rich-text-editor";
import { useDashboardStore } from "@/modules/dashboard/store/dashboard-store";
import { useDataLibraryTabsStore } from "./store/data-library-tabs-store";

interface PageWithChildren extends PageRecord {
  children?: PageWithChildren[];
}

export function PageLibrary() {
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [pagesWithChildren, setPagesWithChildren] = useState<PageWithChildren[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState("");
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageId: number } | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [pageToRename, setPageToRename] = useState<{ id: number; currentTitle: string } | null>(null);
  const [newRenameTitle, setNewRenameTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const titleUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const surface = useDashboardStore((state) => state.surfaceStyle);
  const hydrateDataLibraryTabs = useDataLibraryTabsStore((state) => state.hydrate);
  const currentTabId = useDataLibraryTabsStore((state) => state.currentTabId);

  const { showToast } = useToast();

  const loadPagesWithChildren = useCallback(async (preserveSelection: boolean = false) => {
    // Get currentTabId from store to ensure we have the latest value
    const tabsStore = useDataLibraryTabsStore.getState();
    const tabId = tabsStore.currentTabId;
    
    if (tabId === null) {
      // No tab selected, clear pages
      setPages([]);
      setPagesWithChildren([]);
      return;
    }
    
    // Recursively load children for a page
    const loadPageWithChildren = async (page: PageRecord): Promise<PageWithChildren> => {
      const children = await pageRepository.list(page.id, tabId);
      const childrenWithNested = await Promise.all(
        children.map(child => loadPageWithChildren(child))
      );
      return { ...page, children: childrenWithNested };
    };

    try {
      const currentSelectedId = preserveSelection ? selectedPageId : null;
      const rootPages = await pageRepository.list(null, tabId);
      setPages(rootPages);
      
      // Recursively load all children
      const pagesWithChildrenData: PageWithChildren[] = await Promise.all(
        rootPages.map(page => loadPageWithChildren(page))
      );
      
      setPagesWithChildren(pagesWithChildrenData);
      
      // Only auto-select first page if no page is selected and we're not preserving selection
      if (rootPages.length > 0 && !preserveSelection && !selectedPageId) {
        setSelectedPageId(rootPages[0].id);
      }
    } catch (error) {
      console.error("Failed to load pages:", error);
      showToast("Failed to load pages", "error");
    }
  }, [showToast, selectedPageId]); // Keep selectedPageId for preserveSelection logic

  const loadPage = useCallback(async (pageId: number) => {
    try {
      const page = await pageRepository.get(pageId);
      if (page) {
        setSelectedPage(page);
        setPageContent(page.content || "");
      }
    } catch (error) {
      console.error("Failed to load page:", error);
      showToast("Failed to load page", "error");
    }
  }, [showToast]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await hydrateDataLibraryTabs();
        // Wait a bit to ensure currentTabId is set in the store
        // Then reload pages with the current tab
        const tabsStore = useDataLibraryTabsStore.getState();
        if (tabsStore.currentTabId) {
          await loadPagesWithChildren();
        }
      } finally {
        setLoading(false);
      }
    };
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPageId) {
      void loadPage(selectedPageId);
    }
  }, [selectedPageId, loadPage]);

  // Reload pages when tab changes
  useEffect(() => {
    if (currentTabId !== null) {
      void loadPagesWithChildren(false);
      setSelectedPageId(null);
      setSelectedPage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTabId]); // Only depend on currentTabId, not loadPagesWithChildren to prevent loops

  const handleCreatePage = async () => {
    if (!currentTabId) {
      showToast("Please select a tab first", "error");
      return;
    }
    try {
      const page = await pageRepository.create({
        title: "Untitled",
        content: "",
        parentId: null, // Always create at root level
        tabId: currentTabId, // Associate with current tab
      });
      if (page) {
        // Reload pages with children
        await loadPagesWithChildren();
        setSelectedPageId(page.id);
        // Focus the title input after a short delay to ensure it's rendered
        setTimeout(() => {
          titleInputRef.current?.focus();
          titleInputRef.current?.select();
        }, 100);
        showToast("Page created", "success");
      } else {
        showToast("Failed to create page", "error");
      }
    } catch (error) {
      console.error("Failed to create page:", error);
      showToast("Failed to create page", "error");
    }
  };

  const handleCreateChildPage = async (parentId: number) => {
    try {
      const tabsStore = useDataLibraryTabsStore.getState();
      const tabId = tabsStore.currentTabId;
      if (!tabId) {
        showToast("Please select a tab first", "error");
        return;
      }

      const page = await pageRepository.create({
        title: "Untitled",
        content: "",
        parentId: parentId,
        tabId: tabId,
      });
      if (page) {
        // Expand the parent
        setExpandedPages((prev) => new Set([...prev, parentId]));
        // Reload pages with children
        await loadPagesWithChildren(false);
        // Set selected page ID and load it immediately
        setSelectedPageId(page.id);
        await loadPage(page.id);
        showToast("Page created", "success");
      } else {
        showToast("Failed to create page", "error");
      }
    } catch (error) {
      console.error("Failed to create page:", error);
      showToast("Failed to create page", "error");
    }
  };

  // Calculate the depth of a page by traversing up the parent chain
  const getPageDepth = useCallback((pageId: number | null, allPages: PageWithChildren[]): number => {
    if (pageId === null) return 0;
    
    // Find the page in the tree recursively
    const findPageInTree = (pages: PageWithChildren[], targetId: number): PageWithChildren | null => {
      for (const page of pages) {
        if (page.id === targetId) return page;
        if (page.children && page.children.length > 0) {
          const found = findPageInTree(page.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const page = findPageInTree(allPages, pageId);
    if (!page) return 0;
    
    // Traverse up to root to count depth
    let depth = 0;
    let currentParentId: number | null = page.parentId;
    
    while (currentParentId !== null) {
      depth++;
      const parent = findPageInTree(allPages, currentParentId);
      if (!parent) break;
      currentParentId = parent.parentId;
    }
    
    return depth;
  }, []);

  const handleGroupPages = async (pageId: number) => {
    // Get the current page
    const currentPage = await pageRepository.get(pageId);
    if (!currentPage) return;

    // Check depth - only allow grouping if depth < 2 (level 0 or 1)
    const depth = getPageDepth(pageId, pagesWithChildren);
    if (depth >= 2) {
      showToast("Cannot create accordions beyond 2 levels", "error");
      return;
    }

    try {
      // Create a new group page with the same order as the current page
      // This ensures it appears in the same position
      const groupPage = await pageRepository.create({
        title: "New Group",
        content: "",
        parentId: currentPage.parentId, // Keep the same parent level
        order: currentPage.order ?? currentPage.id, // Use the same order as the original page
        tabId: currentTabId, // Associate with current tab
      });

      if (groupPage) {
        // Move the current page under the group, preserving its tabId
        await pageRepository.update(pageId, {
          parentId: groupPage.id,
          tabId: currentTabId, // Preserve tabId when moving
        });

        // Create a new page under the group
        const newPage = await pageRepository.create({
          title: "Untitled",
          content: "",
          parentId: groupPage.id,
          tabId: currentTabId, // Associate with current tab
        });

        if (newPage) {
          // Expand the group and reload
          setExpandedPages((prev) => new Set([...prev, groupPage.id]));
          // Reload pages to show the new structure
          await loadPagesWithChildren(false);
          // Select the moved page (the one that was clicked) instead of the new page
          setSelectedPageId(pageId);
          showToast("Pages grouped", "success");
        }
      }
    } catch (error) {
      console.error("Failed to group pages:", error);
      showToast("Failed to group pages", "error");
    }
  };


  const handleDeletePage = (pageId: number) => {
    setPageToDelete(pageId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeletePage = async () => {
    if (!pageToDelete) return;

    try {
      // Get the page before deleting to check for parent
      const pageToDeleteRecord = await pageRepository.get(pageToDelete);
      const parentId = pageToDeleteRecord?.parentId ?? null;
      
      const wasSelected = selectedPageId === pageToDelete;
      await pageRepository.remove(pageToDelete);
      
      // Check if parent exists and is now empty (no children left)
      if (parentId !== null) {
        const tabsStore = useDataLibraryTabsStore.getState();
        const tabId = tabsStore.currentTabId;
        if (tabId !== null) {
          const parentChildren = await pageRepository.list(parentId, tabId);
          if (parentChildren.length === 0) {
            // Parent is now empty, delete it too
            await pageRepository.remove(parentId);
            // If the parent was selected, clear selection
            if (selectedPageId === parentId) {
              setSelectedPage(null);
              setPageContent("");
            }
          }
        }
      }
      
      await loadPagesWithChildren(false); // Don't preserve selection since we're deleting
      
      if (wasSelected) {
        // Clear the selected page state first
        setSelectedPage(null);
        setPageContent("");
        
        // Get the updated pages list and select the first one if available
        const tabsStore = useDataLibraryTabsStore.getState();
        const tabId = tabsStore.currentTabId;
        if (tabId !== null) {
          const remaining = await pageRepository.list(null, tabId);
          if (remaining.length > 0) {
            setSelectedPageId(remaining[0].id);
            // loadPage will be called by the useEffect when selectedPageId changes
          } else {
            setSelectedPageId(null);
          }
        } else {
          setSelectedPageId(null);
        }
      }
      
      setDeleteConfirmOpen(false);
      setPageToDelete(null);
      showToast("Page deleted", "success");
    } catch (error) {
      console.error("Failed to delete page:", error);
      showToast("Failed to delete page", "error");
      setDeleteConfirmOpen(false);
      setPageToDelete(null);
    }
  };

  const handleContentChange = (content: string) => {
    setPageContent(content);
    
    // Debounce the save operation
    if (contentUpdateTimeout.current) {
      clearTimeout(contentUpdateTimeout.current);
    }
    
    contentUpdateTimeout.current = setTimeout(async () => {
      if (selectedPage) {
        try {
          await pageRepository.update(selectedPage.id, { content });
        } catch (error) {
          console.error("Failed to save content:", error);
          showToast("Failed to save content", "error");
        }
      }
    }, 500);
  };

  const handleTitleChange = (title: string) => {
    if (selectedPage) {
      const currentPageId = selectedPage.id;
      // Allow empty state in UI, but save as "Untitled" if empty
      // Optimistically update the local state immediately with the actual input value
      setSelectedPage({ ...selectedPage, title });
      
      // Debounce the database update (but don't reload pages to avoid focus loss)
      if (titleUpdateTimeout.current) {
        clearTimeout(titleUpdateTimeout.current);
      }
      
      titleUpdateTimeout.current = setTimeout(async () => {
        try {
          // Only save "Untitled" if the title is empty after trimming
          const finalTitle = title.trim() || "Untitled";
          await pageRepository.update(currentPageId, { title: finalTitle });
          // Only reload pages structure, not the selected page content
          // This prevents focus loss and page switching
          // Get current tabId from store to filter pages correctly
          const tabsStore = useDataLibraryTabsStore.getState();
          const tabId = tabsStore.currentTabId;
          
          const rootPages = await pageRepository.list(null, tabId);
          setPages(rootPages);
          
          // Recursively reload children structure
          const loadPageWithChildren = async (page: PageRecord): Promise<PageWithChildren> => {
            const children = await pageRepository.list(page.id, tabId);
            const childrenWithNested = await Promise.all(
              children.map(child => loadPageWithChildren(child))
            );
            return { ...page, children: childrenWithNested };
          };
          
          const pagesWithChildrenData: PageWithChildren[] = await Promise.all(
            rootPages.map(page => loadPageWithChildren(page))
          );
          
          setPagesWithChildren(pagesWithChildrenData);
        } catch (error) {
          console.error("Failed to update title:", error);
          showToast("Failed to update title", "error");
        }
      }, 500);
    }
  };

  const togglePageExpanded = (pageId: number) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, pageId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, pageId });
  };

  const handleRename = (pageId: number, currentTitle: string) => {
    setPageToRename({ id: pageId, currentTitle });
    setNewRenameTitle(currentTitle);
    setRenameDialogOpen(true);
    setContextMenu(null);
  };

  const confirmRename = async () => {
    if (!pageToRename || !newRenameTitle.trim()) {
      return;
    }

    try {
      const finalTitle = newRenameTitle.trim() || "Untitled";
      await pageRepository.update(pageToRename.id, { title: finalTitle });
      await loadPagesWithChildren();
      if (selectedPageId === pageToRename.id) {
        setSelectedPage({ ...selectedPage!, title: newRenameTitle.trim() });
      }
      setRenameDialogOpen(false);
      setPageToRename(null);
      setNewRenameTitle("");
      showToast("Page renamed", "success");
    } catch (error) {
      console.error("Failed to rename page:", error);
      showToast("Failed to rename page", "error");
    }
  };

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  const renderPageItem = (page: PageWithChildren, level: number = 0) => {
    const hasChildren = page.children && page.children.length > 0;
    const isExpanded = expandedPages.has(page.id);
    const isSelected = selectedPageId === page.id;
    const depth = getPageDepth(page.id, pagesWithChildren);
    // Only show + button for grouping if depth < 2 (level 0 or 1)
    const canCreateGroup = depth < 2;

    return (
      <div key={page.id}>
        <div
          className={cn(
            "group flex items-center mb-1 rounded-lg transition-colors",
            isSelected && !hasChildren && "bg-accent",
            !isSelected && !hasChildren && "hover:bg-accent/50",
            hasChildren && "hover:bg-accent/50"
          )}
        >
          <div className="flex items-center flex-1 min-w-0" style={{ paddingLeft: `${level * 16}px` }}>
            {hasChildren ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePageExpanded(page.id);
                  }}
                  className="mr-1 p-0.5 hover:bg-accent rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-3 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => togglePageExpanded(page.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setPageToRename({ id: page.id, currentTitle: page.title });
                    setNewRenameTitle(page.title);
                    setRenameDialogOpen(true);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, page.id)}
                  className={cn(
                    "flex-1 flex items-center px-3 py-2 rounded-lg text-left transition-colors min-w-0",
                    isSelected ? "text-accent-foreground" : "text-foreground"
                  )}
                >
                  <Folder className="size-4 flex-shrink-0 mr-2" />
                  <span className="flex-1 font-medium truncate">{page.title}</span>
                </button>
                {canCreateGroup && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateChildPage(page.id);
                    }}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                    title="Add page to folder"
                  >
                    <Plus className="size-3" />
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="w-4 mr-1" />
                <button
                  onClick={() => setSelectedPageId(page.id)}
                  className={cn(
                    "flex-1 flex items-center px-3 py-2 rounded-lg text-left transition-colors min-w-0",
                    isSelected
                      ? "text-accent-foreground"
                      : "text-foreground"
                  )}
                >
                  <File className="size-4 flex-shrink-0 mr-2" />
                  <span className="flex-1 font-medium truncate">{page.title}</span>
                </button>
                {canCreateGroup && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGroupPages(page.id);
                    }}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                    title="Group pages"
                  >
                    <Plus className="size-3" />
                  </Button>
                )}
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleDeletePage(page.id)}
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete page"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {page.children!.map((child) => renderPageItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    return () => {
      if (contentUpdateTimeout.current) {
        clearTimeout(contentUpdateTimeout.current);
      }
      if (titleUpdateTimeout.current) {
        clearTimeout(titleUpdateTimeout.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <Card className="w-64 flex-shrink-0 flex flex-col border-r border-border/70 bg-card rounded-none py-0">
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground m-0">Pages</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCreatePage}
            className="h-7 w-7 rounded-lg"
            title="New page"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {!pagesWithChildren || pagesWithChildren.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <FileText className="size-8 mx-auto mb-2 opacity-50" />
              <p>No pages yet</p>
              <p className="text-xs mt-1">Click + to add one</p>
            </div>
          ) : (
            pagesWithChildren.map((page) => renderPageItem(page))
          )}
        </div>
      </Card>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedPage ? (
          (() => {
            // Check if selected page has children (it's a folder/accordion)
            const selectedPageWithChildren = pagesWithChildren.find(p => p.id === selectedPage.id);
            const hasChildren = selectedPageWithChildren?.children && selectedPageWithChildren.children.length > 0;
            
            // Only show editor if it's not a parent page (folder)
            if (hasChildren) {
              return (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-8">
                  <div className="text-center max-w-md w-full">
                    <Folder className="size-12 mx-auto mb-4 opacity-50" />
                    <Input
                      value={selectedPage.title}
                      onChange={async (e) => {
                        const title = e.target.value;
                        setSelectedPage({ ...selectedPage, title });
                        // Save with default if empty
                        const finalTitle = title.trim() || "Untitled";
                        await pageRepository.update(selectedPage.id, { title: finalTitle });
                        await loadPagesWithChildren();
                      }}
                      className={cn(
                        "text-2xl font-semibold border border-border rounded-lg px-4 py-2 mb-4 text-center focus-visible:ring-2 focus-visible:ring-ring w-full shadow-sm bg-transparent",
                        surface === "glass" && "surface--glass",
                        surface === "neumorphic" && "surface--neumorphic",
                        surface === "default" && "border border-border/70 surface--default"
                      )}
                      placeholder="Group name"
                    />
                    <p className="text-sm">This is a folder. Select a page inside to edit.</p>
                  </div>
                </div>
              );
            }
            
            return (
              <>
                <div className="flex-shrink-0 px-8 pt-4 pb-2">
                  <Input
                    ref={titleInputRef}
                    value={selectedPage.title === "Untitled" ? "" : selectedPage.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onBlur={(e) => {
                      // When user leaves the field, if it's empty, set to "Untitled"
                      if (!e.target.value.trim()) {
                        handleTitleChange("Untitled");
                      }
                    }}
                    className={cn(
                      "text-3xl font-bold border border-border rounded-lg px-4 py-4 focus-visible:ring-2 focus-visible:ring-ring shadow-sm bg-transparent h-auto min-h-16",
                      surface === "glass" && "surface--glass",
                      surface === "neumorphic" && "surface--neumorphic",
                      surface === "default" && "border border-border/70 surface--default"
                    )}
                    placeholder="Untitled"
                  />
                </div>
                <div className="flex-1 overflow-hidden px-8 pt-2 pb-6">
                  <RichTextEditor
                    content={pageContent}
                    onChange={handleContentChange}
                    placeholder="Start writing..."
                    surfaceStyle={surface}
                  />
                </div>
              </>
            );
          })()
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="size-12 mx-auto mb-3 opacity-50" />
              <p>Select a page or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent onEnter={confirmDeletePage}>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this page? All content and child pages will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setPageToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePage}
              className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      {contextMenu && typeof window !== "undefined" && document.body && createPortal(
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] w-48 rounded-xl border border-border/70 bg-card p-2 shadow-2xl"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {(() => {
            const page = pagesWithChildren.find(p => p.id === contextMenu.pageId) || 
                        pagesWithChildren.flatMap(p => p.children || []).find(c => c.id === contextMenu.pageId);
            if (!page) return null;
            const hasChildren = page.children && page.children.length > 0;
            
            // Only show context menu for folders (accordions)
            if (!hasChildren) return null;
            
            return (
              <button
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleRename(contextMenu.pageId, page.title);
                }}
              >
                <Edit2 className="size-4" />
                Rename
              </button>
            );
          })()}
        </div>,
        document.body
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Enter a new name for this page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newRenameTitle}
              onChange={(e) => setNewRenameTitle(e.target.value)}
              placeholder="Page title..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void confirmRename();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameDialogOpen(false);
                setPageToRename(null);
                setNewRenameTitle("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
