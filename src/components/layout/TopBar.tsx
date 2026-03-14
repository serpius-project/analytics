"use client";
import { ThemeToggle } from "./ThemeToggle";
import { MobileSidebar } from "./MobileSidebar";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur">
      <div className="flex items-center gap-3">
        <MobileSidebar />
        <h1 className="text-base font-semibold leading-tight truncate">{title}</h1>
      </div>
      <ThemeToggle />
    </header>
  );
}
