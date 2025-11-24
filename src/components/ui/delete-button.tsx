"use client";

import { Button, ButtonProps } from "./button";
import { X } from "lucide-react";

interface DeleteButtonProps extends ButtonProps {
  onClick: () => void;
}

export function DeleteButton({
  onClick,
  size = "sm",
  ...props
}: DeleteButtonProps) {
  return (
    <Button variant="destructive" size={size} onClick={onClick} {...props}>
      <X />
    </Button>
  );
}
