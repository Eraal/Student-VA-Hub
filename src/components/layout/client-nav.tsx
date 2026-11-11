"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  CheckSquare,
  FileText,
} from "lucide-react";

const clientNavItems = [
  {
    name: "Home",
    href: "/client",
    exact: true,
    icon: Home,
  },
  {
    name: "Calendar",
    href: "/client/calendar",
    exact: false,
    icon: Calendar,
  },
  {
    name: "Tasks",
    href: "/client/tasks",
    exact: false,
    icon: CheckSquare,
  },
  {
    name: "Timesheets",
    href: "/client/timesheets",
    exact: false,
    icon: FileText,
  },
];

export function ClientNav() {
  const pathname = usePathname();

  const isItemActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar (md:flex) */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-1">
        <span className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Navigation
        </span>

        {clientNavItems.map((item) => {
          const active = isItemActive(item.href, item.exact);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-semibold shadow-xs"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </aside>

      {/* Mobile Bottom Tab Bar (flex md:hidden) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-[var(--color-border)] bg-[var(--color-bg)] px-1 md:hidden"
      >
        {clientNavItems.map((item) => {
          const active = isItemActive(item.href, item.exact);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full py-1 text-[10px] font-medium transition-colors ${
                active
                  ? "text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <div
                className={`flex size-7 items-center justify-center rounded-md transition-colors ${
                  active
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                    : "bg-transparent"
                }`}
              >
                <Icon className="size-4" />
              </div>
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
