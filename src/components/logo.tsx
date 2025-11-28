"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Logo({ width = 24, height = 24, className }: { width?: number; height?: number; className?: string }) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine if we should use dark mode colors
  const isDark = mounted && (theme === "dark" || (theme === "system" && systemTheme === "dark"));

  // Light mode colors
  const lightColors = {
    block1: "#CBD5E1",
    block2: "#94A3B8",
    block3: "#64748B",
    block4: "#334155",
  };

  // Dark mode colors
  const darkColors = {
    block1: "#334155",
    block2: "#475569",
    block3: "#64748B",
    block4: "#CBD5E1",
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <svg
      viewBox="10 10 80 80"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Modular blocks only */}
      <g transform="translate(20,20)">
        <rect width="20" height="20" rx="4" fill={colors.block1} />
        <rect x="24" width="36" height="20" rx="4" fill={colors.block2} />
        <rect y="24" width="36" height="36" rx="4" fill={colors.block3} />
        <rect x="40" y="24" width="20" height="36" rx="4" fill={colors.block4} />
      </g>
    </svg>
  );
}

