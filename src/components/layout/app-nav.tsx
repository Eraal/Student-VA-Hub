"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface NavItemConfig {
  id: string;
  name: string;
  href: string;
  exact: boolean;
  icon: LucideIcon;
  badgeType?: "tasks" | "time" | "timesheets";
}

export interface AppNavProps {
  role: "student" | "client";
  items: NavItemConfig[];
  todoCount?: number;
  tasksAttentionCount?: number;
  hasActiveTimer?: boolean;
  pendingHours?: number;
  pendingApprovalCount?: number;
  defaultCollapsed?: boolean;
}

function NavItemTooltip({
  enabled,
  content,
  children,
}: {
  enabled: boolean;
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppNav({
  role,
  items,
  todoCount = 0,
  tasksAttentionCount = 0,
  hasActiveTimer = false,
  pendingHours = 0,
  pendingApprovalCount,
  defaultCollapsed = false,
}: AppNavProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isTablet, setIsTablet] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const tasksBadgeCount = role === "client" ? tasksAttentionCount : todoCount;
  const timesheetsBadgeCount =
    pendingApprovalCount !== undefined
      ? pendingApprovalCount
      : pendingHours
        ? Math.round(pendingHours)
        : 0;

  React.useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const updateTablet = () => setIsTablet(media.matches);
    updateTablet();
    media.addEventListener("change", updateTablet);
    return () => media.removeEventListener("change", updateTablet);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof document !== "undefined") {
        document.cookie = `sidebar_collapsed=${next}; path=/; max-age=31536000; SameSite=Lax`;
      }
      return next;
    });
  };

  const isItemActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isEffectivelyCollapsed = mounted ? isTablet || isCollapsed : isCollapsed;

  return (
    <>
      {/* Desktop / Tablet Sidebar (strictly hidden below 768px, 1px standard border, no shell shadow) */}
      <aside
        aria-label="Sidebar Navigation"
        style={{
          top: "var(--header-h)",
          height: "calc(100dvh - var(--header-h))",
        }}
        className={cn(
          "hidden md:flex flex-col shrink-0 sticky self-start bg-white border-r border-[#E5DFD5] z-20 overflow-hidden transition-[width] duration-200 ease-in-out motion-reduce:transition-none shadow-none",
          isCollapsed ? "w-[72px]" : "w-[72px] lg:w-[264px]"
        )}
      >
        {/* Nav Items List on top with its own overflow-y-auto and 16px padding on top */}
        <div
          className={cn(
            "flex flex-col gap-1.5 w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-4 pb-2",
            isCollapsed ? "px-3" : "px-3 lg:px-4"
          )}
        >
          {items.map((item) => {
            const active = isItemActive(item.href, item.exact);
            const Icon = item.icon;

            let badgeTooltipText = item.name;
            if (item.badgeType === "tasks" && tasksBadgeCount > 0) {
              badgeTooltipText =
                role === "client"
                  ? `${item.name} (${tasksBadgeCount} needing attention)`
                  : `${item.name} (${tasksBadgeCount})`;
            } else if (item.badgeType === "time" && hasActiveTimer) {
              badgeTooltipText = `${item.name} (Timer running)`;
            } else if (item.badgeType === "timesheets" && timesheetsBadgeCount > 0) {
              badgeTooltipText = `${item.name} (${timesheetsBadgeCount} waiting for approval)`;
            }

            return (
              <NavItemTooltip
                key={item.href}
                enabled={isEffectivelyCollapsed}
                content={badgeTooltipText}
              >
                <Link
                  href={item.href}
                  data-testid={`nav-${item.id}`}
                  aria-label={item.name}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center rounded-xl transition-all cursor-pointer relative select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2",
                    isCollapsed
                      ? "size-12 p-0 justify-center mx-auto"
                      : "size-12 p-0 justify-center mx-auto lg:w-full lg:h-12 lg:px-4 lg:justify-start lg:gap-3 lg:mx-0",
                    active
                      ? "bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                      : "text-slate-700 hover:text-[#0F172A] hover:bg-[#FAF7F2] border-[1.5px] border-transparent"
                  )}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon className="size-5 shrink-0" strokeWidth={1.75} />

                    {/* Collapsed dot / count badge on top of icon */}
                    {item.badgeType === "tasks" && tasksBadgeCount > 0 && (
                      <span
                        className={cn(
                          "absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ring-2",
                          active
                            ? "bg-white text-[#0F172A] ring-[#0F172A]"
                            : "bg-[#0F172A] text-white ring-white",
                          isCollapsed ? "flex" : "flex lg:hidden"
                        )}
                        aria-hidden="true"
                      >
                        {tasksBadgeCount}
                      </span>
                    )}

                    {item.badgeType === "time" && hasActiveTimer && (
                      <span
                        className={cn(
                          "absolute -top-0.5 -right-0.5 flex size-2.5 items-center justify-center",
                          isCollapsed ? "flex" : "flex lg:hidden"
                        )}
                        aria-hidden="true"
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75 motion-reduce:hidden" />
                        <span className="relative inline-flex rounded-full size-2.5 bg-[#16A34A] ring-1 ring-white" />
                      </span>
                    )}

                    {item.badgeType === "timesheets" && timesheetsBadgeCount > 0 && (
                      <span
                        className={cn(
                          "absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ring-2",
                          active
                            ? "bg-white text-[#0F172A] ring-[#0F172A]"
                            : "bg-[#0F172A] text-white ring-white",
                          isCollapsed ? "flex" : "flex lg:hidden"
                        )}
                        aria-hidden="true"
                      >
                        {timesheetsBadgeCount}
                      </span>
                    )}
                  </div>

                  {/* Expanded item label next to icon, left-aligned (desktop 1024px+) */}
                  <span
                    className={cn(
                      "text-[15px] font-medium leading-none text-left truncate",
                      isCollapsed ? "hidden" : "hidden lg:inline"
                    )}
                  >
                    {item.name}
                  </span>

                  {/* Status badges pushed to far right with ml-auto */}
                  {item.badgeType === "tasks" && tasksBadgeCount > 0 && (
                    <span
                      className={cn(
                        "ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold shrink-0",
                        active
                          ? "bg-white text-[#0F172A]"
                          : "bg-[#FAF7F2] text-[#0F172A] border border-[#0F172A] shadow-[1px_1px_0px_0px_#0F172A]",
                        isCollapsed ? "hidden" : "hidden lg:flex"
                      )}
                      aria-hidden="true"
                    >
                      {tasksBadgeCount}
                    </span>
                  )}

                  {item.badgeType === "time" && hasActiveTimer && (
                    <span
                      className={cn(
                        "ml-auto relative flex size-2.5 items-center justify-center shrink-0",
                        isCollapsed ? "hidden" : "hidden lg:flex"
                      )}
                      aria-hidden="true"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75 motion-reduce:hidden" />
                      <span className="relative inline-flex rounded-full size-2.5 bg-[#16A34A]" />
                    </span>
                  )}

                  {item.badgeType === "timesheets" && timesheetsBadgeCount > 0 && (
                    <span
                      className={cn(
                        "ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold shrink-0",
                        active
                          ? "bg-white text-[#0F172A]"
                          : "bg-[#FAF7F2] text-[#0F172A] border border-[#0F172A] shadow-[1px_1px_0px_0px_#0F172A]",
                        isCollapsed ? "hidden" : "hidden lg:flex"
                      )}
                      aria-hidden="true"
                    >
                      {timesheetsBadgeCount}
                    </span>
                  )}
                </Link>
              </NavItemTooltip>
            );
          })}
        </div>

        {/* Bottom Pinned Area: Legend + Collapse Button (1px standard border) */}
        <div
          className={cn(
            "mt-auto pt-3 pb-4 border-t border-[#E5DFD5] flex flex-col gap-3 shrink-0 w-full bg-white",
            isCollapsed ? "px-3" : "px-3 lg:px-4"
          )}
        >
          {/* Expanded Legend (desktop 1024px+) */}
          <div
            className={cn(
              "space-y-1.5 px-1",
              isCollapsed ? "hidden" : "hidden lg:block"
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block px-0.5">
              Legend
            </span>
            <div className="space-y-1.5 px-0.5 text-xs font-semibold text-[#0F172A]">
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full bg-[#2563EB] shrink-0" aria-hidden="true" />
                <span>Class</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full bg-[#16A34A] shrink-0" aria-hidden="true" />
                <span>Work</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full bg-[#DC2626] shrink-0" aria-hidden="true" />
                <span>Conflict</span>
              </div>
            </div>
          </div>

          {/* Collapsed Legend (three stacked dots) */}
          <div
            className={cn(
              "items-center justify-center py-1",
              isCollapsed ? "flex" : "flex lg:hidden"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  className="flex flex-col items-center gap-2 py-1 cursor-help rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
                  aria-label="Legend: Class, Work, Conflict"
                >
                  <span className="size-2.5 rounded-full bg-[#2563EB]" title="Class" />
                  <span className="size-2.5 rounded-full bg-[#16A34A]" title="Work" />
                  <span className="size-2.5 rounded-full bg-[#DC2626]" title="Conflict" />
                  <span className="sr-only">Legend: Class, Work, Conflict</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#2563EB]" />
                    <span>Class</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#16A34A]" />
                    <span>Work</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#DC2626]" />
                    <span>Conflict</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Collapse Toggle Button */}
          <Tooltip open={isEffectivelyCollapsed ? undefined : false}>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-testid="nav-collapse-toggle"
                onClick={toggleCollapse}
                className={cn(
                  "flex items-center h-10 rounded-xl text-xs font-bold text-slate-700 hover:text-[#0F172A] hover:bg-[#FAF7F2] border border-transparent hover:border-[#0F172A] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
                  isCollapsed
                    ? "justify-center size-10 mx-auto"
                    : "size-10 justify-center mx-auto lg:w-full lg:size-auto lg:h-10 lg:px-3 lg:gap-2.5 lg:justify-start lg:mx-0"
                )}
                aria-label={isEffectivelyCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="size-4 shrink-0" strokeWidth={1.75} />
                ) : (
                  <>
                    <ChevronRight className="size-4 shrink-0 flex lg:hidden" strokeWidth={1.75} />
                    <ChevronLeft className="size-4 shrink-0 hidden lg:flex" strokeWidth={1.75} />
                    <span className="hidden lg:inline">Collapse</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {isEffectivelyCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar (strictly below 768px, 56px tall, 1px border, safe-area padding, no shadow) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-[#E5DFD5] bg-white px-1 md:hidden shadow-none pb-[env(safe-area-inset-bottom)]"
      >
        {items.map((item) => {
          const active = isItemActive(item.href, item.exact);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.id}-mobile`}
              aria-label={item.name}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-14 min-w-0 py-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] select-none",
                active ? "text-[#0F172A]" : "text-slate-500 hover:text-[#0F172A]"
              )}
            >
              <div className="relative">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg transition-all",
                    active
                      ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
                      : "bg-transparent text-slate-500"
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                </div>

                {/* Mobile Badges */}
                {item.badgeType === "tasks" && tasksBadgeCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#0F172A] text-[8px] font-bold text-white px-1 ring-1 ring-white"
                    aria-hidden="true"
                  >
                    {tasksBadgeCount}
                  </span>
                )}

                {item.badgeType === "time" && hasActiveTimer && (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex size-2 items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75 motion-reduce:hidden" />
                    <span className="relative inline-flex rounded-full size-2 bg-[#16A34A] ring-1 ring-white" />
                  </span>
                )}

                {item.badgeType === "timesheets" && timesheetsBadgeCount > 0 && (
                  <span
                    className="absolute -top-1 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#0F172A] text-[8px] font-bold text-white px-1 ring-1 ring-white"
                    aria-hidden="true"
                  >
                    {timesheetsBadgeCount}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  "truncate text-[10px] leading-tight mt-0.5 max-w-full px-0.5",
                  active ? "font-bold text-[#0F172A]" : "font-medium text-slate-500"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
