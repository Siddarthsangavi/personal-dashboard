"use client";

import { useEffect } from "react";
import { init } from "@microsoft/clarity";

export function ClarityAnalytics() {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_ID;
    if (projectId) {
      init(projectId);
    } else {
      console.warn("Microsoft Clarity Project ID not found. Please set NEXT_PUBLIC_MICROSOFT_CLARITY_ID in your .env file.");
    }
  }, []);

  return null;
}
