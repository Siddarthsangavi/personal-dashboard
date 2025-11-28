import { useMemo } from "react";

export interface ResponsiveGridConfig {
  columns: number;
  minColumnWidth: number;
}

/**
 * Calculates grid columns - uses fixed column width to prevent shrinking
 * But allows grid to expand beyond 16 columns if screen is wider
 */
export function useResponsiveGrid(width: number): ResponsiveGridConfig {
  return useMemo(() => {
    if (!width || width <= 0) {
      return { columns: 16, minColumnWidth: 70 };
    }

    const gap = 16;
    const FIXED_BASE_WIDTH = 1200;
    
    // Calculate fixed column width based on 1200px (prevents shrinking)
    const totalGapWidth = gap * (16 + 1); // 16 columns + padding
    const availableWidth = FIXED_BASE_WIDTH - totalGapWidth;
    const fixedColumnWidth = availableWidth / 16;
    
    // Calculate how many columns can fit in the actual width
    // This allows the grid to expand beyond 16 columns on wider screens
    const actualAvailableWidth = width - totalGapWidth;
    const maxColumns = Math.floor(actualAvailableWidth / (fixedColumnWidth + gap));
    
    // Use at least 16 columns, but allow more if screen is wider
    const columns = Math.max(16, maxColumns);
    
    return {
      columns,
      minColumnWidth: fixedColumnWidth, // Always use fixed width to prevent shrinking
    };
  }, [width]);
}

