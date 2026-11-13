"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/lib/labels";
import { formatDate, formatPeso } from "@/lib/format";
import { getInitials } from "@/components/profile/profile-header-card";

interface StudentLinkedClientCardProps {
  linkedClient: {
    id: string;
    name: string;
    email: string;
  } | null;
  link: {
    id: string;
    hourlyRate: number;
    status: string;
    createdAt?: Date | string;
  } | null;
}

export function StudentLinkedClientCard({
  linkedClient,
  link,
}: StudentLinkedClientCardProps) {
  const isLinked = !!linkedClient && !!link;

  return (
    <Card
      data-testid="linked-card"
      className="border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl"
    >
      <CardHeader className="px-5 py-4 sm:px-6 sm:py-4 border-b border-[#E5DFD5]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="font-display text-lg font-bold text-[#0F172A]">
              Linked client
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Your client and agreed hourly rate.
            </CardDescription>
          </div>
          {isLinked && <StatusBadge status={link.status} />}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {isLinked ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="size-11 sm:size-12 shrink-0 border-[1.5px] border-[#0F172A] bg-[#0F172A]">
                  <AvatarFallback className="text-sm sm:text-base font-display font-bold text-white bg-[#0F172A]">
                    {getInitials(linkedClient.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 space-y-0.5">
                  <p className="font-display text-base font-bold text-[#0F172A] truncate">
                    {linkedClient.name}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    {linkedClient.email}
                  </p>
                </div>
              </div>

              {/* Rate pill */}
              <div className="shrink-0">
                <span className="inline-flex items-center rounded-full border-[1.5px] border-[#0F172A] bg-white px-3 py-1 text-xs font-bold font-display tabular-nums text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                  {`${formatPeso(link.hourlyRate)}/hr`}
                </span>
              </div>
            </div>

            {link.createdAt && (
              <p className="text-xs text-slate-500 pt-3 border-t border-[#E5DFD5]">
                Linked since {formatDate(link.createdAt)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            No client linked yet. Share your invite code and your client will appear here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
