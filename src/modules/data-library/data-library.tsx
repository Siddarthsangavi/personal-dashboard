"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Folder, Plus, X, FilePenLine, Trash2, Search, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconButton } from "@/components/core/icon-button";
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
    
  dataLibraryCategoryRepository,
  dataLibraryItemRepository,
  type DataLibraryCategoryRecord,
  type DataLibraryItemRecord,
  type DataLibraryItemType,
} from "@/lib/db";
import { cn } from "@/lib/utils";
import styles from "./data-library.module.scss";
import { Database, Lock, FolderOpen, Link as LinkIcon, FileText, Key } from "lucide-react";

export function DataLibrary() {
  const [categories, setCategories] = useState<DataLibraryCategoryRecord[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [items, setItems] = useState<DataLibraryItemRecord[]>([]);
  const [allItems, setAllItems] = useState<DataLibraryItemRecord[]>([]);
  const [revealedItems, setRevealedItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteCategoryOpen, setConfirmDeleteCategoryOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [query, setQuery] = useState("");
  const [editingItem, setEditingItem] = useState<DataLibraryItemRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DataLibraryItemRecord | null>(null);
  const [draftItem, setDraftItem] = useState({
    name: "",
    value: "",
    tags: "",
    type: "text" as DataLibraryItemType,
    isSensitive: false,
  });

  const { showToast } = useToast();

  const refreshItems = useCallback(async () => {
    try {
      const all = await dataLibraryItemRepository.list();
      setAllItems(all);
    } catch (error) {
      console.error("Failed to load items:", error);
      showToast("Failed to load items", "error");
    }
  }, [showToast]);

  // Load categories and items
  useEffect(() => {
    const loadData = async () => {
      try {
        const existingCategories = await dataLibraryCategoryRepository.list();
        setCategories(existingCategories);
        if (existingCategories.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(existingCategories[0].id);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
        showToast("Failed to load categories", "error");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
    void refreshItems();
  }, [showToast, refreshItems]);

  // Filter items when category changes
  useEffect(() => {
    if (!selectedCategoryId) {
      setItems([]);
      return;
    }

    const categoryItems = allItems.filter((item) => item.categoryId === selectedCategoryId);
    const ordered = categoryItems.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setItems(ordered);
  }, [selectedCategoryId, allItems]);

  const openItemEditor = useCallback((item?: DataLibraryItemRecord) => {
    if (item) {
      setEditingItem(item);
      setDraftItem({
        name: item.name,
        value: item.value,
        tags: item.tags.join(", "),
        type: item.type || "text",
        isSensitive: item.isSensitive,
      });
    } else {
      setEditingItem(null);
      setDraftItem({
        name: "",
        value: "",
        tags: "",
        type: "text",
        isSensitive: false,
      });
    }
    setItemDialogOpen(true);
  }, []);

  const resetItemEditor = () => {
    setEditingItem(null);
    setDraftItem({
      name: "",
      value: "",
      tags: "",
      type: "text",
      isSensitive: false,
    });
  };

  const handleSaveItem = async () => {
    if (!selectedCategoryId) {
      showToast("Please select a category first", "error");
      return;
    }

    if (!draftItem.name.trim() || !draftItem.value.trim()) {
      showToast("Name and value are required", "error");
      return;
    }

    try {
      const tags = draftItem.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const isSensitive = draftItem.isSensitive || (draftItem.type === "credential" || draftItem.type === "api-key");

      if (editingItem) {
        await dataLibraryItemRepository.update(editingItem.id, {
          name: draftItem.name.trim(),
          value: draftItem.value.trim(),
          tags,
          type: draftItem.type,
          isSensitive,
        });
        showToast("Item updated", "success");
      } else {
        await dataLibraryItemRepository.create({
          categoryId: selectedCategoryId,
          name: draftItem.name.trim(),
          value: draftItem.value.trim(),
          tags,
          type: draftItem.type,
          isSensitive,
        });
        showToast("Item added", "success");
      }

      setItemDialogOpen(false);
      resetItemEditor();
      void refreshItems();
    } catch (error) {
      console.error("Failed to save item:", error);
      showToast("Failed to save item", "error");
    }
  };

  const handleCopy = async (item: DataLibraryItemRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.value);
      showToast("Copied to clipboard", "success");
    } catch (error) {
      console.error("Failed to copy:", error);
      showToast("Failed to copy to clipboard", "error");
    }
  };

  const toggleReveal = (itemId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const confirmDelete = (item: DataLibraryItemRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDelete(item);
    setConfirmDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await dataLibraryItemRepository.remove(pendingDelete.id);
      setPendingDelete(null);
      setConfirmDeleteOpen(false);
      void refreshItems();
      showToast("Item deleted", "success");
    } catch (error) {
      console.error("Failed to delete item:", error);
      showToast("Failed to delete item", "error");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast("Category name is required", "error");
      return;
    }

    try {
      const category = await dataLibraryCategoryRepository.create({ name: newCategoryName.trim() });
      if (category) {
        setCategories((prev) => [...prev, category]);
        setSelectedCategoryId(category.id);
        setNewCategoryName("");
        setCategoryDialogOpen(false);
        showToast("Category created", "success");
      }
    } catch (error) {
      console.error("Failed to create category:", error);
      showToast("Failed to create category", "error");
    }
  };

  const handleDeleteCategory = (categoryId: number) => {
    setCategoryToDelete(categoryId);
    setConfirmDeleteCategoryOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      await dataLibraryCategoryRepository.remove(categoryToDelete);
      setCategories((prev) => {
        const updated = prev.filter((c) => c.id !== categoryToDelete);
        if (selectedCategoryId === categoryToDelete) {
          setSelectedCategoryId(updated.length > 0 ? updated[0].id : null);
        }
        return updated;
      });
      setAllItems((prev) => prev.filter((item) => item.categoryId !== categoryToDelete));
      setConfirmDeleteCategoryOpen(false);
      setCategoryToDelete(null);
      showToast("Category deleted", "success");
    } catch (error) {
      console.error("Failed to delete category:", error);
      showToast("Failed to delete category", "error");
      setConfirmDeleteCategoryOpen(false);
      setCategoryToDelete(null);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes("database") || name.includes("db")) {
      return Database;
    }
    if (name.includes("login") || name.includes("credential")) {
      return Lock;
    }
    if (name.includes("project")) {
      return FolderOpen;
    }
    return Folder;
  };

  const getItemTypeIcon = (type?: DataLibraryItemType) => {
    const itemType = type || "text";
    switch (itemType) {
      case "credential":
      case "api-key":
        return Lock;
      case "url":
        return LinkIcon;
      case "database":
        return Database;
      case "text":
        return FileText;
      default:
        return FileText;
    }
  };

  const getItemTypeLabel = (type?: DataLibraryItemType) => {
    const itemType = type || "text";
    switch (itemType) {
      case "credential":
        return "Credential";
      case "api-key":
        return "API Key";
      case "url":
        return "URL";
      case "database":
        return "Database";
      case "text":
        return "Text";
      case "other":
        return "Other";
      default:
        return "Text";
    }
  };

  const maskValue = (value: string, isSensitive: boolean, isRevealed: boolean): string => {
    if (!isSensitive || isRevealed) {
      return value;
    }
    return "•".repeat(Math.min(value.length, 20));
  };

  const shouldAutoMask = (type?: DataLibraryItemType): boolean => {
    return type === "credential" || type === "api-key";
  };

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.value.toLowerCase().includes(lower) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lower))
    );
  }, [items, query]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left Sidebar - Categories */}
      <Card className="w-64 flex-shrink-0 flex flex-col border border-border/70 bg-card rounded-xl">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Categories</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCategoryDialogOpen(true)}
            className="h-7 w-7 rounded-lg"
            title="Add category"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Folder className="size-8 mx-auto mb-2 opacity-50" />
              <p>No categories yet</p>
              <p className="text-xs mt-1">Click + to add one</p>
            </div>
          ) : (
            categories.map((category) => {
              const Icon = getCategoryIcon(category.name);
              const isSelected = category.id === selectedCategoryId;
              const categoryItems = allItems.filter((item) => item.categoryId === category.id);

              return (
                <div
                  key={category.id}
                  className={cn(
                    "group flex items-center gap-2 mb-1",
                    isSelected && "bg-accent rounded-lg"
                  )}
                >
                  <button
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={cn(
                      "flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50 text-foreground"
                    )}
                  >
                    <Icon className="size-4 flex-shrink-0" />
                    <span className="flex-1 font-medium">{category.name}</span>
                    <span className="text-xs text-muted-foreground">{categoryItems.length}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete category"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Right Panel - Items Grid */}
      <Card className="flex-1 flex flex-col border border-border/70 bg-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {selectedCategory?.name || "Select a category"}
          </h2>
          {selectedCategoryId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openItemEditor()}
              className="gap-2 rounded-lg"
            >
              <Plus className="size-4" />
              Add Item
            </Button>
          )}
        </div>

        {!selectedCategoryId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Folder className="size-12 mx-auto mb-3 opacity-50" />
              <p>Select a category or create a new one</p>
            </div>
          </div>
        ) : (
          <div className={styles.dataLibrary}>
            {filteredItems.length >= 10 && (
              <div className="px-6 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search items..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            <div className={styles.itemGrid}>
              {filteredItems.length === 0 ? (
                <button
                  className={cn(styles.itemCard, styles.addCard)}
                  onClick={() => openItemEditor()}
                >
                  <Plus className="size-4" />
                </button>
              ) : (
                <>
                  {filteredItems.map((item) => {
                    const isRevealed = revealedItems.has(item.id);
                    const displayValue = maskValue(item.value, item.isSensitive, isRevealed);
                    const TypeIcon = getItemTypeIcon(item.type);

                    return (
                      <article
                        key={item.id}
                        className={styles.itemCard}
                        onClick={() => openItemEditor(item)}
                      >
                        <div className={styles.cardActions}>
                          <IconButton
                            icon={<FilePenLine className="size-4" />}
                            label="Edit item"
                            onClick={(e) => {
                              e.stopPropagation();
                              openItemEditor(item);
                            }}
                          />
                          <IconButton
                            icon={<Trash2 className="size-4" />}
                            label="Delete item"
                            onClick={(e) => confirmDelete(item, e)}
                          />
                        </div>
                        <h3 className={styles.itemName}>{item.name}</h3>
                        <div className={styles.itemValue}>{displayValue}</div>
                        <div className={styles.itemMeta}>
                          <div className={styles.itemType}>
                            <TypeIcon className="size-3" />
                            <span>{getItemTypeLabel(item.type)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {item.isSensitive && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={(e) => toggleReveal(item.id, e)}
                                className="h-5 w-5"
                                title={isRevealed ? "Hide value" : "Show value"}
                              >
                                {isRevealed ? (
                                  <EyeOff className="size-3" />
                                ) : (
                                  <Eye className="size-3" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => handleCopy(item, e)}
                              className="h-5 w-5"
                              title="Copy value"
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  <button
                    className={cn(styles.itemCard, styles.addCard)}
                    onClick={() => openItemEditor()}
                  >
                    <Plus className="size-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Projects, Logins, Databases"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleCreateCategory();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) resetItemEditor();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "New Item"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the item details and save."
                : "Add a name and value. You can specify type, tags, and mark as sensitive."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Name *</Label>
              <Input
                id="item-name"
                value={draftItem.name}
                onChange={(e) => setDraftItem({ ...draftItem, name: e.target.value })}
                placeholder="e.g., Production DB, GitHub Token, API Endpoint"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-type">Type</Label>
                <select
                  id="item-type"
                  value={draftItem.type}
                  onChange={(e) => {
                    const newType = e.target.value as DataLibraryItemType;
                    setDraftItem({
                      ...draftItem,
                      type: newType,
                      isSensitive: shouldAutoMask(newType) || draftItem.isSensitive,
                    });
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="text">Text</option>
                  <option value="credential">Credential</option>
                  <option value="api-key">API Key</option>
                  <option value="url">URL</option>
                  <option value="database">Database</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-tags">Tags (comma-separated)</Label>
                <Input
                  id="item-tags"
                  value={draftItem.tags}
                  onChange={(e) => setDraftItem({ ...draftItem, tags: e.target.value })}
                  placeholder="e.g., production, api, database"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-value">Value *</Label>
              <Textarea
                id="item-value"
                value={draftItem.value}
                onChange={(e) => setDraftItem({ ...draftItem, value: e.target.value })}
                placeholder={
                  draftItem.type === "text"
                    ? "Enter any text content..."
                    : draftItem.type === "credential" || draftItem.type === "api-key"
                    ? "Enter the credential or API key..."
                    : draftItem.type === "url"
                    ? "Enter the URL..."
                    : draftItem.type === "database"
                    ? "Enter the database connection string..."
                    : "Enter the value..."
                }
                rows={draftItem.type === "text" ? 6 : 4}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="item-sensitive"
                checked={draftItem.isSensitive}
                onChange={(e) => setDraftItem({ ...draftItem, isSensitive: e.target.checked })}
                disabled={shouldAutoMask(draftItem.type)}
                className="h-4 w-4 rounded border-input disabled:opacity-50"
              />
              <Label
                htmlFor="item-sensitive"
                className={cn(
                  "font-normal cursor-pointer",
                  shouldAutoMask(draftItem.type) && "opacity-50"
                )}
              >
                {shouldAutoMask(draftItem.type)
                  ? "Automatically masked (Credential/API Key)"
                  : "Mark as sensitive (will be masked by default)"}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The item will be removed from your data library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={confirmDeleteCategoryOpen} onOpenChange={setConfirmDeleteCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? All items in it will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDeleteCategoryOpen(false);
                setCategoryToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCategory}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
