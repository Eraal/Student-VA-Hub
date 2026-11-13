"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Copy, Check, ShieldCheck, ArrowRight } from "lucide-react";
import type { StudentDashboardData } from "@/lib/services/dashboard-service";
import { formatPeso } from "@/lib/format";

interface LinkedClientCardProps {
  linkedClient: StudentDashboardData["linkedClient"];
}

export function LinkedClientCard({ linkedClient }: LinkedClientCardProps) {
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/student/invite-code")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.code?.code) {
          setInviteCode(data.code.code);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const clientInitials = linkedClient?.name
    ? linkedClient.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CL";

  return (
    <Card className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
      <CardHeader className="p-0 pb-3 border-b border-[#E5DFD5]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Linked Client
          </span>
          <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#F0FDF4] text-[#16A34A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
            <Briefcase className="size-3.5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-4 space-y-3">
        {linkedClient ? (
          /* Client Linked State — Direct layout, NO nested bordered box, rate doesn't touch edges */
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#0F172A] text-white font-black text-sm shrink-0 border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]">
                  {clientInitials}
                </div>
                <div className="min-w-0">
                  <h4 className="font-display text-sm sm:text-base font-bold text-[#0F172A] truncate">
                    {linkedClient.name}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    {linkedClient.email}
                  </p>
                </div>
              </div>

              {/* Rate pill badge with safe padding so it never touches the card border */}
              <Badge
                variant="secondary"
                className="px-3 py-1 text-xs font-black shrink-0 border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]"
              >
                {formatPeso(linkedClient.hourlyRate)}/hr
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#16A34A] bg-[#F0FDF4] px-2.5 py-1.5 rounded-lg border border-[#16A34A]/20">
              <ShieldCheck className="size-3.5" />
              <span>Direct client link &bull; Agreed hourly rate</span>
            </div>
          </div>
        ) : (
          /* Empty state: No client linked yet */
          <div className="space-y-3">
            <div className="space-y-1">
              <h4 className="font-display text-sm font-bold text-[#0F172A]">
                No linked client yet
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Share your invite code with your client so they can link your account and assign tasks.
              </p>
            </div>

            {/* Invite code display with copy button */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2]">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Your Invite Code
                </span>
                <span className="font-mono text-sm font-black text-[#0F172A] tracking-wider">
                  {inviteCode ?? "GET CODE"}
                </span>
              </div>

              <Button
                size="xs"
                variant="outline"
                onClick={handleCopyCode}
                disabled={!inviteCode}
                className="text-xs font-bold border-[1.5px] border-[#0F172A] bg-white shadow-[1.5px_1.5px_0px_0px_#0F172A] gap-1 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="size-3 text-[#16A34A]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <div className="pt-3 border-t border-[#E5DFD5] flex items-center justify-between text-xs">
        <Link
          href="/student/profile"
          className="text-[11px] font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1"
        >
          <span>Manage in Profile</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}

