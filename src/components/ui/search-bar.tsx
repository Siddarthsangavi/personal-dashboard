"use client";

import { Input } from "./input";

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  searchTerm,
  setSearchTerm,
  placeholder = "Search...",
  className,
}: SearchBarProps) {
  return (
    <Input
      placeholder={placeholder}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className={className}
    />
  );
}
