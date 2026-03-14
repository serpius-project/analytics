"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, BarChart2, Layers, Globe, DollarSign, Info, Home } from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/index-performance", label: "Index Performance", icon: BarChart2 },
  { href: "/index-composition", label: "Index Composition", icon: Layers },
  { href: "/stats-snapshot", label: "Stats Snapshot", icon: Globe },
  { href: "/accounting", label: "Accounting", icon: DollarSign },
  { href: "/about", label: "About", icon: Info },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-56 p-0">
        <div className="flex items-center gap-2 px-4 py-5 border-b">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/layer.svg" alt="Wedefin" className="w-6 h-6" />
          <span className="font-semibold text-sm">Wedefin</span>
        </div>
        <nav className="py-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                pathname === href
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-accent/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
