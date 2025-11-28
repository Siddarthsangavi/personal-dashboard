"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";

function MobileMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-lg border border-border bg-card shadow-lg">
        <div className="space-y-4">
          <div className="text-6xl mb-4">💻</div>
          <h1 className="text-2xl font-bold text-foreground">
            Desktop Experience Required
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            This dashboard requires a minimum screen width of 1200px. 
            Please use a larger screen or expand your browser window for the best experience.
          </p>
        </div>
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Thank you for your understanding!
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const checkMobile = () => {
      // Check if screen width is less than 1200px (minimum required width)
      setIsMobile(window.innerWidth < 1200);
    };

    // Check on mount
    checkMobile();

    // Check on resize
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <main className="min-h-screen">
        <AppShell />
      </main>
    );
  }

  if (isMobile) {
    return <MobileMessage />;
  }

  return (
    <main className="min-h-screen" style={{ width: '100vw', minWidth: '1200px', overflowX: 'auto' }}>
      <AppShell />
    </main>
  );
}
