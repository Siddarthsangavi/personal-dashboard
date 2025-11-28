"use client";

import { DataLibrary } from "@/modules/data-library/data-library";

export default function DataLibraryPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Background container */}
      <div className="absolute inset-0 bg-background -z-10" />
      
      <div className="flex-1 overflow-hidden relative z-0">
        <DataLibrary />
      </div>
    </div>
  );
}

