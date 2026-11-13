"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { logoutAction } from "@/lib/actions/auth";
import { StatusBadge } from "@/lib/labels";
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
    <header
      style={{ height: "var(--header-h)" }}
      className="sticky top-0 z-30 flex h-[var(--header-h)] w-full items-center justify-between border-b border-[#E5DFD5] bg-[#FAF7F2]/95 backdrop-blur-md px-3 sm:px-6 shrink-0"
    >
      {/* Left: Brand Logo (never pushes controls off-screen) */}
      <div className="flex items-center min-w-0 shrink">
        <Link
          href={isStudent ? "/student" : "/client"}
          className="group flex items-center gap-2 sm:gap-2.5 rounded-lg p-1 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
          aria-label="VAwise Dashboard"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0F172A] text-white shadow-[2px_2px_0px_0px_#0F172A] transition-transform group-hover:-translate-y-0.5">
            {isStudent ? (
              <GraduationCap className="size-4 shrink-0" />
            ) : (
              <Briefcase className="size-4 shrink-0" />
            )}
          </div>
          <span className="font-display font-extrabold text-xs sm:text-base tracking-tight text-[#0F172A] truncate">
            VAwise
          </span>
        </Link>
      </div>

      {/* Right: Notifications & Profile Menu — always visible on one row */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Bell (Notifications) */}
        <Link
          href={notificationsUrl}
          title="Notifications"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className={`relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg border-[1.5px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] ${isNotificationsActive
              ? "border-[#0F172A] bg-[#0F172A] text-white shadow-[2px_2px_0px_0px_#0F172A]"
              : "border-[#0F172A] bg-white text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2] hover:translate-x-[0.5px] hover:translate-y-[0.5px]"
            }`}
        >
          <Bell className="size-4 shrink-0" />
          {unreadCount > 0 && (
            <span
              data-testid="bell-badge"
              aria-hidden="true"
              className={`absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold font-mono shadow-xs ${isNotificationsActive
                  ? "bg-white text-[#0F172A] border-[1px] border-[#0F172A]"
                  : "bg-[#0F172A] text-white ring-2 ring-white"
                }`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile Menu Dropdown with Role Label inside */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-lg border-[1.5px] border-[#0F172A] bg-white px-2 py-1.5 sm:px-3 text-xs font-bold text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2] transition-all cursor-pointer shrink-0 ${menuOpen ? "bg-[#FAF7F2]" : ""
              }`}
          >
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-white text-[10px] font-bold">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="max-w-[70px] sm:max-w-[120px] truncate text-xs">
              {user.name ?? "Account"}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-slate-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border-[1.5px] border-[#0F172A] bg-white p-2 shadow-[4px_4px_0px_0px_#0F172A] z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-[#E5DFD5] mb-1.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#0F172A] truncate">
                    {user.name}
                  </p>
                  <StatusBadge status={user.role} className="text-[10px] px-2 py-0.5" />
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {user.email}
                </p>
              </div>

              <Link
                href={profileUrl}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#0F172A] hover:bg-[#FAF7F2] transition-colors"
              >
                <User className="size-4 text-slate-500" />
                <span>Profile and Settings</span>
              </Link>

              <form action={logoutAction} className="w-full mt-1.5 pt-1.5 border-t border-[#E5DFD5]">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                >
                  <LogOut className="size-4" />
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
