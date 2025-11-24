"use client";

import { Button, ButtonProps } from "./button";
import { Trash2 } from "lucide-react";

interface TrashButtonProps extends ButtonProps {
  onClick: () => void;
}

export function TrashButton({
  onClick,
  size = "sm",
  ...props
}: TrashButtonProps) {
  return (
    <Button variant="destructive" size={size} onClick={onClick} {...props}>
      <Trash2 />
    </Button>
  );
}
