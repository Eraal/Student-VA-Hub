import * as React from "react";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  CalendarDays,
  CheckSquare,
  Clock,
  ArrowRight,
  School,
  BookOpen,
} from "lucide-react";

async function StudentHomeContent() {
  const user = await requireRolePage(Role.STUDENT);

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });

  const link = await prisma.clientStudentLink.findUnique({
    where: { studentId: user.id },
    include: { client: true },
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Kumusta, {user.name}!
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Maligayang pagdating sa iyong Student VA Portal.
        </p>
      </div>

      {/* Overview Card */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
                <GraduationCap className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                  Student Profile Status
                </CardTitle>
                <CardDescription className="text-xs text-[var(--color-muted)]">
                  {user.email}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Student VA
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <School className="size-3.5 text-[var(--color-muted)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] text-[var(--color-muted)] block">School</span>
                  <span className="font-medium text-[var(--color-text)]">
                    {profile?.school ?? "Not set"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <BookOpen className="size-3.5 text-[var(--color-muted)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] text-[var(--color-muted)] block">Course</span>
                  <span className="font-medium text-[var(--color-text)]">
                    {profile?.course ?? "Not set"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[var(--color-muted)] block">Capacity</span>
                <span className="font-medium text-[var(--color-text)]">
                  Max {profile?.maxHoursPerDay ?? 4}h / day
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <div>
              <span className="text-xs font-semibold text-[var(--color-text)] block">
                {link ? `Naka-link kay ${link.client.name}` : "Wala pang client"}
              </span>
              <span className="text-[11px] text-[var(--color-muted)]">
                {link
                  ? `Agreed rate: ₱${link.hourlyRate}/hr`
                  : "Ibahagi ang iyong invite code para magsimula."}
              </span>
            </div>
            <Link href="/student/profile">
              <Button variant="outline" size="xs" className="gap-1 text-xs cursor-pointer">
                <span>View code</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/student/schedule" className="group">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] space-y-2 h-full">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-class-bg)] text-[var(--color-class)]">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--color-text)] block">
                Schedule
              </span>
              <p className="text-[11px] text-[var(--color-muted)]">
                Class schedule at available hours.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/student/tasks" className="group">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] space-y-2 h-full">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-work-bg)] text-[var(--color-work)]">
              <CheckSquare className="size-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--color-text)] block">
                Tasks
              </span>
              <p className="text-[11px] text-[var(--color-muted)]">
                Mga naka-assign na gawain mula sa client.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/student/time" className="group">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] space-y-2 h-full">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
              <Clock className="size-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--color-text)] block">
                Time Tracking
              </span>
              <p className="text-[11px] text-[var(--color-muted)]">
                Time In / Time Out at logged hours.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function StudentPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
          <div className="h-44 rounded-md bg-[var(--color-surface)]" />
        </div>
      }
    >
      <StudentHomeContent />
    </React.Suspense>
  );
}
