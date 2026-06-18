"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  CalendarRange,
  FlaskConical,
  LayoutDashboard,
  Layers,
  LineChart,
  Menu,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Syringe,
} from "lucide-react";
import { useTheme } from "next-themes";

import { APP_NAME, DISCLAIMER_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = { href: string; label: string; icon: React.ElementType };

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/peptides", label: "Peptides", icon: BookOpen },
  { href: "/stacks", label: "Stacks", icon: Layers },
  { href: "/cycles", label: "Cycles", icon: CalendarRange },
  { href: "/log", label: "Log Dose", icon: Syringe },
  { href: "/metrics", label: "Metrics", icon: LineChart },
  { href: "/suggestions", label: "Suggestions", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-5 py-4">
      <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
        <FlaskConical className="size-4" />
      </div>
      <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
    </Link>
  );
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* CSS-driven swap avoids a hydration-guard effect. */}
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex min-h-svh">
      {/* Desktop sidebar */}
      <aside className="bg-card hidden w-64 shrink-0 flex-col border-r lg:flex">
        <Brand />
        <div className="mt-2 flex-1 overflow-y-auto pb-4">
          <NavLinks />
        </div>
        <div className="text-muted-foreground border-t px-5 py-3 text-xs">
          <Activity className="mr-1 inline size-3" />
          {DISCLAIMER_SHORT}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <NavLinks onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
