"use client";

import * as React from "react";
import { AppNav, type NavItemConfig } from "./app-nav";
import {
  Home,
  CalendarDays,
  CheckSquare,
  Clock,
  Wallet,
  BarChart3,
} from "lucide-react";

export const studentNavItems: NavItemConfig[] = [
  {
    id: "home",
    name: "Home",
    href: "/student",
    exact: true,
    icon: Home,
  },
  {
    id: "schedule",
    name: "Schedule",
    href: "/student/schedule",
    exact: false,
    icon: CalendarDays,
  },
  {
    id: "tasks",
    name: "Tasks",
    href: "/student/tasks",
    exact: false,
    icon: CheckSquare,
    badgeType: "tasks",
  },
  {
    id: "time",
    name: "Time",
    href: "/student/time",
    exact: false,
    icon: Clock,
    badgeType: "time",
  },
  {
    id: "earnings",
    name: "Earnings",
    href: "/student/earnings",
    exact: false,
    icon: Wallet,
  },
  {
    id: "reports",
    name: "Reports",
    href: "/student/reports",
    exact: false,
    icon: BarChart3,
  },
];

export interface StudentNavProps {
  todoCount?: number;
  hasActiveTimer?: boolean;
  defaultCollapsed?: boolean;
}

export function StudentNav({
  todoCount = 0,
  hasActiveTimer = false,
  defaultCollapsed = false,
}: StudentNavProps) {
  return (
    <AppNav
      role="student"
      items={studentNavItems}
      todoCount={todoCount}
      hasActiveTimer={hasActiveTimer}
      defaultCollapsed={defaultCollapsed}
    />
  );
}
