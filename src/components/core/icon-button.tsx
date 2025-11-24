"use client";

import { forwardRef, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IconButtonProps extends Omit<ButtonProps, "children"> {
  icon: ReactNode;
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        aria-label={label}
        className={cn("rounded-full", className)}
        {...props}
      >
        {icon}
        <span className="sr-only">{label}</span>
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";

