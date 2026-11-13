"use client";

import * as React from "react";
import type { StudentDashboardData } from "@/lib/services/dashboard-service";
import { PageContainer } from "@/components/layout/page-container";
import { TopStrip } from "./top-strip";
import { ConflictBanner } from "./conflict-banner";
import { StatCards } from "./stat-cards";
import { TodayTimeline } from "./today-timeline";
import { NextUpCard } from "./next-up-card";
import { LinkedClientCard } from "./linked-client-card";

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
    <PageContainer>
      {/* 1. Top Strip: Time-aware greeting, live computed status chip, large 48px Time In / Time Out */}
      <TopStrip
        student={student}
        formattedDate={todayInfo.formattedDate}
        classesToday={classesToday}
        activeTimer={activeTimer}
      />

      {/* 2. Conflict Banner Slot: Red, dismissible, rendered only when warning/capacity limit exists */}
      <ConflictBanner
        isAtCapacity={capacity.isAtCapacity}
        hoursToday={capacity.hoursToday}
        maxHoursPerDay={capacity.maxHoursPerDay}
      />

      {/* 3. Three Stat Cards: 1 focal number in display font each, segmented bar, 7-day mini bar chart */}
      <StatCards
        capacity={capacity}
        tasksSummary={tasksSummary}
        weeklyEarnings={weeklyEarnings}
        linkedClient={linkedClient}
      />

      {/* 4 & 5. 12-Column Grid (Desktop) / Vertical Stack (Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Today's Timeline (7 AM - 10 PM with 'now' marker) */}
        <div className="lg:col-span-8">
          <TodayTimeline
            classesToday={classesToday}
            activeTimer={activeTimer}
          />
        </div>

        {/* Right 4 Columns: Stacked Next Up & Linked Client Cards */}
        <div className="lg:col-span-4 space-y-6">
          <NextUpCard
            nextClass={nextClass}
            nextTask={tasksSummary.nextTask}
            classesToday={classesToday}
          />

          <LinkedClientCard
            linkedClient={linkedClient}
          />
        </div>
      </div>
    </PageContainer>
  );
}
