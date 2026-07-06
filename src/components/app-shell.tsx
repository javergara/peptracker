"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  HeartPulse,
  Images,
  LayoutDashboard,
  Layers,
  LineChart,
  Menu,
  Moon,
  NotebookPen,
  Package,
  Pill,
  Search,
  Settings,
  Sparkles,
  Sun,
  Syringe,
  TestTube,
} from "lucide-react";

const TAB_BAR_TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/log", label: "Log", icon: Syringe, exact: false },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, exact: false },
  { href: "/metrics", label: "Metrics", icon: LineChart, exact: false },
] as const;

function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary navigation"
      className="brand-rail fixed inset-x-0 bottom-0 z-30 flex items-center pt-2.5 pb-[env(safe-area-inset-bottom)] lg:hidden"
      style={{ background: "var(--gradient-ink-bar)", height: "78px" }}
    >
      {TAB_BAR_TABS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none",
              active ? "text-white" : "text-white/55",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
import { useTheme } from "next-themes";

import { DISCLAIMER_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PeptraLogo } from "@/components/brand/peptra-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarCalculator } from "@/components/peptides/sidebar-calculator";
import { GlobalSearch } from "@/components/search/global-search";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { label: string | null; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Tracking",
    items: [
      { href: "/log", label: "Log Dose", icon: Syringe },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/cycles", label: "Cycles", icon: CalendarRange },
      { href: "/inventory", label: "Inventory", icon: Package },
      { href: "/supplements", label: "Supplements", icon: Pill },
      { href: "/checkin", label: "Check-in", icon: ClipboardCheck },
      { href: "/journal", label: "Journal", icon: NotebookPen },
    ],
  },
  {
    label: "Health",
    items: [
      { href: "/metrics", label: "Metrics", icon: LineChart },
      { href: "/labs", label: "Labs", icon: TestTube },
      { href: "/photos", label: "Photos", icon: Images },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/peptides", label: "Peptides", icon: BookOpen },
      { href: "/biomarkers", label: "Biomarkers", icon: HeartPulse },
      { href: "/stacks", label: "Stacks", icon: Layers },
      { href: "/suggestions", label: "Suggestions", icon: Sparkles },
    ],
  },
  {
    label: null,
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  onNavigate,
  onOpenSearch,
}: {
  onNavigate?: () => void;
  onOpenSearch: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-4 px-3">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => {
            onOpenSearch();
            onNavigate?.();
          }}
          className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="border-input text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>
        {/* Quick reconstitution calculator — kept at the very top for fast access. */}
        <SidebarCalculator />
      </div>
      {NAV.map((group, gi) => (
        <div key={group.label ?? `g${gi}`} className="flex flex-col gap-1">
          {group.label ? (
            <p className="text-muted-foreground/70 px-3 pt-1 pb-0.5 text-[0.7rem] font-semibold tracking-wider uppercase">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
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
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center px-5 py-4">
      <PeptraLogo markClassName="size-8" wordClassName="text-lg" />
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

export function AppShell({
  children,
  profileSlot,
}: {
  children: React.ReactNode;
  profileSlot?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <div className="flex min-h-svh">
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="brand-rail hidden w-64 shrink-0 flex-col border-r pt-[env(safe-area-inset-top)] lg:flex">
        <Brand />
        {profileSlot ? <div className="px-3 pb-2">{profileSlot}</div> : null}
        <div className="mt-2 flex-1 overflow-y-auto pb-4">
          <NavLinks onOpenSearch={() => setSearchOpen(true)} />
        </div>
        <div className="text-muted-foreground border-t px-5 py-3 text-xs">
          <Activity className="mr-1 inline size-3" />
          {DISCLAIMER_SHORT}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="bg-background/80 sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
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
            <SheetContent
              side="left"
              className="brand-rail w-72 overflow-y-auto p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              {profileSlot ? (
                <div className="px-3 pb-2">{profileSlot}</div>
              ) : null}
              <NavLinks
                onNavigate={() => setOpen(false)}
                onOpenSearch={() => {
                  setOpen(false);
                  setSearchOpen(true);
                }}
              />
            </SheetContent>
          </Sheet>
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        <main
          id="main-content"
          className="flex-1 px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          {children}
        </main>
      </div>

      <MobileTabBar />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
