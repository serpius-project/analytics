"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { BarChart2, Layers, Globe, DollarSign, Info, Home } from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/index-performance", label: "Index Performance", icon: BarChart2 },
  { href: "/index-composition", label: "Index Composition", icon: Layers },
  { href: "/stats-snapshot", label: "Stats Snapshot", icon: Globe },
  { href: "/accounting", label: "Accounting", icon: DollarSign },
  { href: "/about", label: "About", icon: Info },
];

export function AppNavbar() {
  const pathname = usePathname();
  return (
    <nav className="border-b bg-sidebar/50 sticky top-0 z-50">
      <div className="flex items-center gap-1 px-6 py-4 overflow-x-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-8 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/layer.svg" alt="Wedefin" className="w-5 h-5" />
          <span className="font-semibold text-sm">Wedefin</span>
        </div>

        {/* Nav Links */}
        <div className="flex gap-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs transition-colors rounded-md whitespace-nowrap",
                pathname === href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Theme Toggle */}
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

// Keep AppSidebar as an alias for backwards compatibility
export function AppSidebar() {
  return <AppNavbar />;
}
