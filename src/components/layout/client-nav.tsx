"use client";

import * as React from "react";
import { AppNav, type NavItemConfig } from "./app-nav";
import {
  Home,
  Calendar,
  CheckSquare,
  FileText,
} from "lucide-react";

export const clientNavItems: NavItemConfig[] = [
  {
    id: "home",
    name: "Home",
    href: "/client",
    exact: true,
    icon: Home,
  },
  {
    id: "calendar",
    name: "Calendar",
    href: "/client/calendar",
    exact: false,
    icon: Calendar,
  },
  {
    id: "tasks",
    name: "Tasks",
    href: "/client/tasks",
    exact: false,
    icon: CheckSquare,
    badgeType: "tasks",
  },
  {
    id: "timesheets",
    name: "Timesheets",
    href: "/client/timesheets",
    exact: false,
    icon: FileText,
    badgeType: "timesheets",
  },
];

export interface ClientNavProps {
  todoCount?: number;
  tasksAttentionCount?: number;
  pendingHours?: number;
  pendingApprovalCount?: number;
  defaultCollapsed?: boolean;
}

export function ClientNav({
  todoCount = 0,
  tasksAttentionCount = 0,
  pendingHours = 0,
  pendingApprovalCount,
  defaultCollapsed = false,
}: ClientNavProps) {
  const approvalCount =
    pendingApprovalCount !== undefined
      ? pendingApprovalCount
      : pendingHours
        ? Math.round(pendingHours)
        : 0;

  return (
    <AppNav
      role="client"
      items={clientNavItems}
      todoCount={todoCount}
      tasksAttentionCount={tasksAttentionCount}
      pendingApprovalCount={approvalCount}
      defaultCollapsed={defaultCollapsed}
    />
  );
}
