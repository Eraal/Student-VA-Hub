"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StudentDashboardData } from "@/lib/services/dashboard-service";
import {
  GraduationCap,
  Briefcase,
  Clock,
  CheckSquare,
  ArrowRight,
  Play,
  Calendar,
  AlertTriangle,
  School,
  TrendingUp,
  Sparkles,
} from "lucide-react";

interface StudentDashboardViewProps {
  data: StudentDashboardData;
}

export function StudentDashboardView({ data }: StudentDashboardViewProps) {
  const {
    student,
    linkedClient,
    todayInfo,
    capacity,
    classesToday,
    nextClass,
    activeTimer,
    tasksSummary,
    weeklyEarnings,
  } = data;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Kumusta, {student.name}!
          </h1>
          <p className="text-xs text-[var(--color-muted)]">
            {todayInfo.formattedDate} &bull; {student.school} ({student.course})
          </p>
        </div>

        {/* Quick Time Tracking Action */}
        <div className="flex items-center gap-2">
          {activeTimer ? (
            <Link href="/student/time">
              <Button
                size="sm"
                className="gap-2 cursor-pointer bg-[var(--color-work)] text-white hover:opacity-95 shadow-sm animate-pulse"
              >
                <Clock className="size-4" />
                <span>Naka-Time In: {activeTimer.taskTitle}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          ) : (
            <Link href="/student/time">
              <Button
                size="sm"
                className="gap-1.5 cursor-pointer bg-[var(--color-work)] text-white hover:opacity-90 shadow-sm"
              >
                <Play className="size-3.5 fill-current" />
                <span>Time In</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Daily Capacity Tracker */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                Daily Capacity
              </span>
              <Clock className="size-4 text-[var(--color-muted)]" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[var(--color-text)]">
                  {capacity.hoursToday}h
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  / {capacity.maxHoursPerDay}h max
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[var(--color-border)] h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    capacity.isAtCapacity
                      ? "bg-[var(--color-conflict)]"
                      : "bg-[var(--color-work)]"
                  }`}
                  style={{ width: `${capacity.capacityPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)] pt-0.5">
                <span>{capacity.capacityPercentage}% used</span>
                <span>
                  {capacity.isAtCapacity
                    ? "Limit reached"
                    : `${capacity.remainingHoursToday}h left`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                Tasks to do
              </span>
              <CheckSquare className="size-4 text-[var(--color-muted)]" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[var(--color-text)]">
                  {tasksSummary.todoCount + tasksSummary.doingCount}
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  active ({tasksSummary.doingCount} doing)
                </span>
              </div>

              <div className="text-[11px] text-[var(--color-muted)] truncate">
                {tasksSummary.nextTask ? (
                  <span>Next: &quot;{tasksSummary.nextTask.title}&quot;</span>
                ) : (
                  <span>Walang nakabinbing deadline</span>
                )}
              </div>

              <Link
                href="/student/tasks"
                className="text-[11px] font-medium text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 pt-0.5"
              >
                <span>Tingnan ang tasks</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Earnings */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                This Week&apos;s Work
              </span>
              <TrendingUp className="size-4 text-[var(--color-work)]" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[var(--color-text)]">
                  ₱{weeklyEarnings.estimatedAmount.toLocaleString()}
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  ({weeklyEarnings.hoursThisWeek} hrs)
                </span>
              </div>

              <div className="text-[11px] text-[var(--color-muted)]">
                {linkedClient ? (
                  <span>Rate: ₱{linkedClient.hourlyRate}/hr &bull; {linkedClient.name}</span>
                ) : (
                  <span>Wala pang client na naka-link</span>
                )}
              </div>

              <Link
                href="/student/earnings"
                className="text-[11px] font-medium text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 pt-0.5"
              >
                <span>Tingnan ang earnings</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Burnout Alert Banner (if at capacity) */}
      {capacity.isAtCapacity && (
        <div className="rounded-md border border-[var(--color-conflict)]/40 bg-[var(--color-conflict-bg)] p-3 text-xs text-[var(--color-conflict)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <div>
              <span className="font-semibold block">Naabot mo na ang iyong daily capacity!</span>
              <span className="text-[11px] opacity-90">
                Pangangalaga sa kalusugan: Magpahinga at iwasan ang burnout bago kumuha ng bagong task.
              </span>
            </div>
          </div>
          <Link href="/student/schedule">
            <Button size="xs" variant="outline" className="text-xs bg-white text-[var(--color-text)]">
              Ayusin ang schedule
            </Button>
          </Link>
        </div>
      )}

      {/* Main Content Grid: Today's Timeline + Next Class & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Timeline (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-class-bg)] text-[var(--color-class)]">
                    <Calendar className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                      Today&apos;s Schedule
                    </CardTitle>
                    <CardDescription className="text-xs text-[var(--color-muted)]">
                      Visual sequence ng iyong klase at VA work slots ngayong araw
                    </CardDescription>
                  </div>
                </div>

                <Link href="/student/schedule">
                  <Button variant="ghost" size="xs" className="text-xs gap-1 cursor-pointer">
                    <span>Manage</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-1">
              {classesToday.length > 0 ? (
                <div className="space-y-2">
                  {classesToday.map((cls) => {
                    const isOngoing = cls.status === "ONGOING";
                    const isCompleted = cls.status === "COMPLETED";

                    return (
                      <div
                        key={cls.id}
                        className={`flex items-center justify-between rounded-md border p-3 transition-colors ${
                          isOngoing
                            ? "border-[var(--color-class)] bg-[var(--color-class-bg)] text-[var(--color-class)] ring-1 ring-[var(--color-class)]/30"
                            : isCompleted
                            ? "border-[var(--color-border)] bg-[var(--color-bg)] opacity-60 text-[var(--color-muted)]"
                            : "border-[var(--color-class)]/30 bg-[var(--color-class-bg)]/40 text-[var(--color-class)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-md bg-[var(--color-class)] text-white">
                            <GraduationCap className="size-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold block text-[var(--color-text)]">
                                {cls.subject}
                              </span>
                              {isOngoing && (
                                <Badge className="bg-[var(--color-class)] text-white text-[9px] px-1 py-0 h-4">
                                  Ongoing
                                </Badge>
                              )}
                              {isCompleted && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                  Done
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-[var(--color-muted)]">
                              Academic Class Period
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-medium text-[var(--color-text)] block">
                            {cls.startTimeFormatted} – {cls.endTimeFormatted}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-center text-xs text-[var(--color-muted)]">
                  <GraduationCap className="size-6 mx-auto mb-1.5 opacity-40" />
                  <p className="font-medium text-[var(--color-text)]">
                    Walang klase na naka-schedule ngayong araw!
                  </p>
                  <p className="text-[11px] mt-0.5">
                    Maaari kang mag-focus sa iyong VA tasks o magpahinga.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side Column: Next Class Alert & Client Status */}
        <div className="space-y-4">
          {/* Next Class Focus Card */}
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Upcoming Class
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextClass ? (
                <div className="rounded-md border border-[var(--color-class)]/30 bg-[var(--color-class-bg)] p-3 text-[var(--color-class)]">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block">{nextClass.subject}</span>
                      <span className="text-[11px] opacity-90">
                        {nextClass.startTimeFormatted} – {nextClass.endTimeFormatted}
                      </span>
                    </div>
                  </div>
                  {nextClass.status === "ONGOING" ? (
                    <Badge className="mt-2 bg-[var(--color-class)] text-white text-[10px]">
                      Nagsisimula na ngayon
                    </Badge>
                  ) : (
                    <span className="text-[10px] opacity-80 block mt-1">
                      Maghanda para sa klase
                    </span>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs text-[var(--color-muted)]">
                  Tapos na ang lahat ng klase mo ngayong araw o walang schedule.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Client Info */}
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Linked Client
                </CardTitle>
                <Briefcase className="size-3.5 text-[var(--color-muted)]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {linkedClient ? (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[var(--color-text)] block">
                        {linkedClient.name}
                      </span>
                      <span className="text-[11px] text-[var(--color-muted)]">
                        {linkedClient.email}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs font-bold">
                      ₱{linkedClient.hourlyRate}/hr
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-2">
                  <span className="text-xs font-medium text-[var(--color-text)] block">
                    Wala pang naka-link na client
                  </span>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Ibahagi ang iyong invite code para makapag-assign ng tasks ang iyong client.
                  </p>
                  <Link href="/student/profile">
                    <Button size="xs" variant="outline" className="w-full text-xs">
                      Tingnan ang Invite Code
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
