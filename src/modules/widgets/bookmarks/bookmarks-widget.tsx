// Bookmarks widget removed — placeholder file kept to avoid accidental imports.
// The actual `bookmarks` widget was removed from the catalog and renderer.
export {};
          <div className={styles.emptyState}>
            <Bookmark className="size-8 opacity-30" />
            <p className="text-sm text-muted-foreground mt-2">No bookmarks yet</p>
          </div>
        ) : (
          bookmarks.map((bookmark) => {
            const IconComponent = getIconComponent(bookmark.icon);
            return (
              <div
                key={bookmark.id}
                className={styles.bookmarkItem}
                onContextMenu={(e) => {
                  e.preventDefault();
                }}
              >
                <button
                  className={styles.bookmarkContent}
                  onClick={() => handleOpenBookmark(bookmark.url)}
                  title={`Open ${bookmark.title}`}
                >
                  <div className={styles.bookmarkIcon}>
                    {IconComponent && <IconComponent className="size-5" />}
                  </div>
                  <div className={styles.bookmarkInfo}>
                    <div className={styles.bookmarkTitle}>{bookmark.title}</div>
                    <div className={styles.bookmarkUrl}>{new URL(bookmark.url).hostname}</div>
                  </div>
                  <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <div className={styles.bookmarkActions}>
                  <button
                    className={styles.actionButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(bookmark);
                    }}
                    title="Edit bookmark"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                  <button
                    className={cn(styles.actionButton, styles.deleteButton)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(bookmark.id);
                    }}
                    title="Delete bookmark"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 gap-2"
        onClick={() => {
          resetForm();
          setShowAddDialog(true);
        }}
      >
        <Plus className="size-4" />
        Add Bookmark
      </Button>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Bookmark" : "Add Bookmark"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                placeholder="e.g., GitHub"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">URL</label>
              <Input
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map((icon) => {
                  const IconComponent = getIconComponent(icon);
                  return (
                    <button
                      key={icon}
                      className={cn(
                        "p-2 rounded-md border transition-all",
                        selectedIcon === icon
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      )}
                      onClick={() => {
                        setSelectedIcon(icon);
                        setFormData((prev) => ({ ...prev, icon }));
                      }}
                    >
                      {IconComponent && <IconComponent className="size-4 mx-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!formData.title.trim() || !formData.url.trim()}>
              {editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
