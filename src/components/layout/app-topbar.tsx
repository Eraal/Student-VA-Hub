"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  User,
  LogOut,
  ChevronDown,
  GraduationCap,
  Briefcase,
} from "lucide-react";

interface AppTopbarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: Role;
  };
  unreadCount?: number;
}

export function AppTopbar({ user, unreadCount = 0 }: AppTopbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const isStudent = user.role === Role.STUDENT;
  const notificationsUrl = isStudent
    ? "/student/notifications"
    : "/client/notifications";
  const profileUrl = isStudent ? "/student/profile" : "/client/profile";

  const isNotificationsActive = pathname.startsWith(notificationsUrl);
  const isProfileActive = pathname.startsWith(profileUrl);

  // Close menu on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 md:px-6">
      {/* Left: Brand & Role */}
      <div className="flex items-center gap-3">
        <Link
          href={isStudent ? "/student" : "/client"}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[var(--color-text)] hover:opacity-90"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
            {isStudent ? (
              <GraduationCap className="size-4" />
            ) : (
              <Briefcase className="size-4" />
            )}
          </span>
          <span className="hidden sm:inline font-semibold">Student VA-Hub</span>
        </Link>
        <span className="hidden sm:inline text-xs text-[var(--color-muted)] font-mono">
          /
        </span>
        <Badge
          variant="secondary"
          className="rounded px-2 py-0.5 text-[11px] font-medium"
        >
          {isStudent ? "Student VA" : "Client"}
        </Badge>
      </div>

      {/* Right: Notifications & Profile Menu */}
      <div className="flex items-center gap-2">
        {/* Bell (Notifications) */}
        <Link
          href={notificationsUrl}
          title="Notifications"
          className={`relative flex size-8 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
            isNotificationsActive
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
              : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          }`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-[var(--color-conflict)] ring-2 ring-[var(--color-bg)]" />
          )}
        </Link>

        {/* Profile Menu Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              isProfileActive || menuOpen
                ? "border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text)]"
                : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            }`}
          >
            <div className="flex size-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[10px]">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="max-w-[120px] truncate text-xs font-medium">
              {user.name ?? "Account"}
            </span>
            <ChevronDown className="size-3.5 text-[var(--color-muted)]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-56 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-sm z-50">
              <div className="px-2 py-1.5 border-b border-[var(--color-border)] mb-1">
                <p className="text-xs font-semibold text-[var(--color-text)] truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-[var(--color-muted)] truncate">
                  {user.email}
                </p>
              </div>

              <Link
                href={profileUrl}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
              >
                <User className="size-3.5 text-[var(--color-muted)]" />
                <span>Profile and Settings</span>
              </Link>

              <form action={logoutAction} className="w-full mt-1 pt-1 border-t border-[var(--color-border)]">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-[var(--color-conflict)] hover:bg-[var(--color-conflict-bg)] transition-colors cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>Log out</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

