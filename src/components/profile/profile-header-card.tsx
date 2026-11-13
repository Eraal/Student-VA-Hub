"use client";

import * as React from "react";
import { Role } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

interface ProfileHeaderCardProps {
  name: string;
  role: Role;
  email: string;
}

export function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileHeaderCard({
  name,
  role,
  email,
}: ProfileHeaderCardProps) {
  const initials = getInitials(name);

  return (
    <Card
      data-testid="profile-header"
      className="p-4 sm:p-5 border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          {/* Avatar with initials in ink circle */}
          <Avatar className="size-12 sm:size-14 shrink-0 border-[1.5px] border-[#0F172A] bg-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]">
            <AvatarFallback className="text-base sm:text-lg font-display font-bold text-white bg-[#0F172A]">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Identity Details */}
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0F172A] truncate">
                {name || "Your Profile"}
              </h2>
              <StatusBadge status={role} />
            </div>
            <p className="text-xs sm:text-sm text-slate-600 truncate">
              {email}
            </p>
          </div>
        </div>

        {/* Desktop / tablet neutral ink-outline logout button */}
        <form action={logoutAction} className="hidden sm:block shrink-0">
          <Button
            type="submit"
            variant="outline"
            data-testid="profile-logout-header"
            className="h-10 px-3.5 sm:px-4 font-bold border-[1.5px] border-[#0F172A] text-[#0F172A] bg-white hover:bg-[#FAF7F2] shadow-[2px_2px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <LogOut className="size-4" />
            <span>Log out</span>
          </Button>
        </form>
      </div>
    </Card>
  );
}
