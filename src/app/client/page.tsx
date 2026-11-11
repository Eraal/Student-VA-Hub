import * as React from "react";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getClientLinkedStudent } from "@/lib/services/invite-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Calendar,
  CheckSquare,
  FileText,
  ArrowRight,
  School,
  GraduationCap,
} from "lucide-react";

async function ClientHomeContent() {
  const user = await requireRolePage(Role.CLIENT);
  const link = await getClientLinkedStudent(user.id);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Kumusta, {user.name}!
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Maligayang pagdating sa iyong Client Portal.
        </p>
      </div>

      {/* Linked Student Summary Card */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
                <Briefcase className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                  Active Student VA
                </CardTitle>
                <CardDescription className="text-xs text-[var(--color-muted)]">
                  {user.email}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Client
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {link ? (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-[var(--color-class-bg)] text-[var(--color-class)]">
                    <GraduationCap className="size-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text)] block">
                      {link.student.name}
                    </span>
                    <span className="text-[11px] text-[var(--color-muted)]">
                      {link.student.email}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[var(--color-muted)] block uppercase font-medium">
                    Rate
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text)]">
                    ₱{link.hourlyRate}/hr
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] pt-1 border-t border-[var(--color-border)]">
                <School className="size-3.5" />
                <span>
                  {link.student.studentProfile?.school ?? "Student"} &bull;{" "}
                  {link.student.studentProfile?.course ?? "VA"} (Year{" "}
                  {link.student.studentProfile?.year ?? 1})
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--color-text)] block">
                  Wala pang naka-link na Student VA
                </span>
                <span className="text-[11px] text-[var(--color-muted)]">
                  Humingi ng 8-character invite code sa iyong student VA.
                </span>
              </div>
              <Link href="/client/profile">
                <Button variant="outline" size="xs" className="gap-1 text-xs cursor-pointer">
                  <span>Link student</span>
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/client/calendar" className="group">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] space-y-2 h-full">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-class-bg)] text-[var(--color-class)]">
              <Calendar className="size-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--color-text)] block">
                Calendar
              </span>
              <p className="text-[11px] text-[var(--color-muted)]">
                Tingnan ang available hours at class schedule ng student.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/client/tasks" className="group">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] space-y-2 h-full">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-work-bg)] text-[var(--color-work)]">
              <CheckSquare className="size-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--color-text)] block">
                Tasks
              </span>
              <p className="text-[11px] text-[var(--color-muted)]">
                Mag-assign ng bagong tasks at subaybayan ang progreso.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/client/timesheets" className="group">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] space-y-2 h-full">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
              <FileText className="size-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--color-text)] block">
                Timesheets
              </span>
              <p className="text-[11px] text-[var(--color-muted)]">
                I-review at i-approve ang logged hours at invoices.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function ClientPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
          <div className="h-44 rounded-md bg-[var(--color-surface)]" />
        </div>
      }
    >
      <ClientHomeContent />
    </React.Suspense>
  );
}
