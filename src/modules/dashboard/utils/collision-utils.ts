/**
 * Collision Detection Utilities
 * Extracted from widget-board and dashboard-store for reusability
 */

import { GridPosition, GridSize } from "@/modules/dashboard/types";

export type Rect = { position: GridPosition; size: GridSize };

/**
 * Checks if two rectangles overlap
 */
export const rectanglesOverlap = (a: Rect, b: Rect): boolean => {
  const aRight = a.position.x + a.size.w;
  const aBottom = a.position.y + a.size.h;
  const bRight = b.position.x + b.size.w;
  const bBottom = b.position.y + b.size.h;

  return (
    a.position.x < bRight &&
    aRight > b.position.x &&
    a.position.y < bBottom &&
    aBottom > b.position.y
  );
};

/**
 * Finds the nearest valid position for a widget to avoid collisions
 */
export const findNearestValidPosition = (
  candidateRect: Rect,
  existingRects: Rect[],
  maxX: number, // Maximum valid X position (not total columns)
  maxY: number, // Maximum valid Y position (not total rows)
  maxOffset: number = 10
): { x: number; y: number } | null => {
  const { position, size } = candidateRect;
  let bestPosition: { x: number; y: number } | null = null;
  let found = false;

  // Try all directions with increasing offsets
  for (let offset = 1; offset <= maxOffset && !found; offset++) {
    // Try right - ensure widget doesn't exceed right boundary
    // maxX is already GRID_SETTINGS.columns - size.w, so rightX <= maxX ensures rightX + size.w <= GRID_SETTINGS.columns
    const rightX = Math.min(position.x + offset, maxX);
    if (rightX >= 0 && rightX <= maxX) {
      const rightRect = { position: { x: rightX, y: position.y }, size };
      if (!existingRects.some((r) => rectanglesOverlap(rightRect, r))) {
        bestPosition = { x: rightX, y: position.y };
        found = true;
        break;
      }
    }

    // Try left
    const leftX = Math.max(0, position.x - offset);
    if (leftX >= 0) {
      const leftRect = { position: { x: leftX, y: position.y }, size };
      if (!existingRects.some((r) => rectanglesOverlap(leftRect, r))) {
        bestPosition = { x: leftX, y: position.y };
        found = true;
        break;
      }
    }

    // Try down - ensure widget doesn't exceed bottom boundary
    const downY = Math.min(position.y + offset, maxY);
    if (downY >= 0 && downY <= maxY) {
      const downRect = { position: { x: position.x, y: downY }, size };
      if (!existingRects.some((r) => rectanglesOverlap(downRect, r))) {
        bestPosition = { x: position.x, y: downY };
        found = true;
        break;
      }
    }

    // Try up
    const upY = Math.max(0, position.y - offset);
    if (upY >= 0) {
      const upRect = { position: { x: position.x, y: upY }, size };
      if (!existingRects.some((r) => rectanglesOverlap(upRect, r))) {
        bestPosition = { x: position.x, y: upY };
        found = true;
        break;
      }
    }
  }

  return bestPosition;
};

/**
 * Clamps a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

