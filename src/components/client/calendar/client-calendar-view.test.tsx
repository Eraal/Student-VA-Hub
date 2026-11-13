import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ClientCalendarView } from "./client-calendar-view";
import type { ClientCalendarData } from "@/lib/services/calendar-service";
import { TaskStatus } from "@prisma/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/actions/task", () => ({
  createTaskAction: vi.fn(),
  checkTaskConflictAction: vi.fn(),
}));

const mockCalendarData: ClientCalendarData = {
  linked: true,
  student: {
    id: "student-1",
    name: "Maria Santos",
    email: "maria@example.com",
    school: "UP Diliman",
    course: "BS Computer Science",
    year: 3,
    hourlyRate: 150,
    maxHoursPerDay: 4,
  },
  studentLiveStatus: {
    state: "AVAILABLE",
    label: "Available now",
    description: "until 9:00 PM",
    untilTime: "9:00 PM",
  },
  nextFreeWindow: {
    formatted: "Mon, Nov 16 · 6:00 PM – 9:00 PM",
    dateKey: "2026-11-16",
    startTime: "18:00",
    endTime: "21:00",
  },
  weekStartKey: "2026-11-16",
  weekEndKey: "2026-11-22",
  weekLabel: "Nov 16 – 22, 2026",
  prevWeekKey: "2026-11-09",
  nextWeekKey: "2026-11-23",
  currentMinutes: 600,
  hasAnyFreeTime: true,
  days: [
    {
      dateKey: "2026-11-16",
      dayOfWeek: 1, // Monday
      dayName: "Monday",
      shortDayName: "Mon",
      formattedDate: "Nov 16",
      isToday: true,
      isPast: false,
      isBlocked: false,
      freeMinutes: 180,
      freeHoursFormatted: "3h free",
      classes: [
        {
          id: "class-1",
          type: "CLASS",
          title: "In class",
          dayOfWeek: 1,
          startMinutes: 8 * 60, // 8:00 AM
          endMinutes: 9 * 60 + 30, // 9:30 AM
          startTimeFormatted: "8:00 AM",
          endTimeFormatted: "9:30 AM",
        },
      ],
      tasks: [
        {
          id: "task-1",
          type: "TASK",
          title: "Prepare research summary",
          dayOfWeek: 1,
          taskStatus: TaskStatus.DOING,
          startMinutes: 14 * 60, // 2:00 PM
          endMinutes: 16 * 60, // 4:00 PM
          startTimeFormatted: "2:00 PM",
          endTimeFormatted: "4:00 PM",
        },
      ],
      openSlots: [
        {
          id: "slot-1",
          type: "OPEN_SLOT",
          title: "Free window",
          dayOfWeek: 1,
          startMinutes: 18 * 60, // 6:00 PM
          endMinutes: 21 * 60, // 9:00 PM
          minutes: 180,
          startTimeFormatted: "6:00 PM",
          endTimeFormatted: "9:00 PM",
        },
      ],
      availabilities: [],
    },
    {
      dateKey: "2026-11-17",
      dayOfWeek: 2, // Tuesday
      dayName: "Tuesday",
      shortDayName: "Tue",
      formattedDate: "Nov 17",
      isToday: false,
      isPast: false,
      isBlocked: true,
      freeMinutes: 0,
      freeHoursFormatted: "0h free",
      classes: [],
      tasks: [],
      openSlots: [],
      availabilities: [],
    },
    {
      dateKey: "2026-11-18",
      dayOfWeek: 3, // Wednesday
      dayName: "Wednesday",
      shortDayName: "Wed",
      formattedDate: "Nov 18",
      isToday: false,
      isPast: false,
      isBlocked: false,
      freeMinutes: 0,
      freeHoursFormatted: "0h free",
      classes: [],
      tasks: [],
      openSlots: [],
      availabilities: [],
    },
    {
      dateKey: "2026-11-19",
      dayOfWeek: 4, // Thursday
      dayName: "Thursday",
      shortDayName: "Thu",
      formattedDate: "Nov 19",
      isToday: false,
      isPast: false,
      isBlocked: false,
      freeMinutes: 0,
      freeHoursFormatted: "0h free",
      classes: [],
      tasks: [],
      openSlots: [],
      availabilities: [],
    },
    {
      dateKey: "2026-11-20",
      dayOfWeek: 5, // Friday
      dayName: "Friday",
      shortDayName: "Fri",
      formattedDate: "Nov 20",
      isToday: false,
      isPast: false,
      isBlocked: false,
      freeMinutes: 0,
      freeHoursFormatted: "0h free",
      classes: [],
      tasks: [],
      openSlots: [],
      availabilities: [],
    },
    {
      dateKey: "2026-11-21",
      dayOfWeek: 6, // Saturday
      dayName: "Saturday",
      shortDayName: "Sat",
      formattedDate: "Nov 21",
      isToday: false,
      isPast: false,
      isBlocked: false,
      freeMinutes: 0,
      freeHoursFormatted: "0h free",
      classes: [],
      tasks: [],
      openSlots: [],
      availabilities: [],
    },
    {
      dateKey: "2026-11-22",
      dayOfWeek: 0, // Sunday
      dayName: "Sunday",
      shortDayName: "Sun",
      formattedDate: "Nov 22",
      isToday: false,
      isPast: false,
      isBlocked: false,
      freeMinutes: 0,
      freeHoursFormatted: "0h free",
      classes: [],
      tasks: [],
      openSlots: [],
      availabilities: [],
    },
  ],
};

describe("ClientCalendarView", () => {
  it("renders header with student first name, subtitle, and week navigation controls", () => {
    const html = renderToString(
      <ClientCalendarView initialData={mockCalendarData} />
    );

    // Title: "[First name]'s schedule"
    expect(html).toContain("Maria&#x27;s schedule");
    expect(html).toContain(
      "Classes and free time. Pick a free window to assign a task."
    );

    // Navigation and actions
    expect(html).toContain('data-testid="calendar-prev"');
    expect(html).toContain('data-testid="calendar-next"');
    expect(html).toContain('data-testid="calendar-today"');
    expect(html).toContain('data-testid="calendar-assign"');
    expect(html).toContain('data-testid="calendar-view-toggle"');
  });

  it("renders live status strip and next free window prompt with Assign then button", () => {
    const html = renderToString(
      <ClientCalendarView initialData={mockCalendarData} />
    );

    expect(html).toContain("Available now until 9:00 PM");
    expect(html).toContain("Next free:");
    expect(html).toContain("Mon, Nov 16 · 6:00 PM – 9:00 PM");
    expect(html).toContain("Assign then");
  });

  it("renders desktop week grid with classes, tasks, open slots, and blocked dates", () => {
    const html = renderToString(
      <ClientCalendarView initialData={mockCalendarData} />
    );

    // Grid container
    expect(html).toContain('data-testid="calendar-week-grid"');

    // Class block (labelled "In class", no subject)
    expect(html).toContain('data-testid="calendar-class-block"');
    expect(html).toContain("In class");
    expect(html).toContain("8:00 AM – 9:30 AM");

    // Open slot block with attributes
    expect(html).toContain('data-testid="calendar-open-slot"');
    expect(html).toContain('data-day="1"');
    expect(html).toContain('data-start="6:00 PM"');
    expect(html).toContain("3h");

    // Task block
    expect(html).toContain('data-testid="calendar-task-block"');
    expect(html).toContain("Prepare research summary");
    expect(html).toContain("2:00 PM – 4:00 PM");

    // Blocked date block
    expect(html).toContain('data-testid="calendar-blocked-day"');
    expect(html).toContain("Not available");

    // Day header free time summary
    expect(html).toContain("3h free");

    // Privacy footnote
    expect(html).toContain(
      "Class details are private. You only see when the student is in class."
    );
  });

  it("enforces strict privacy: never exposes class subjects or blocked reasons", () => {
    const html = renderToString(
      <ClientCalendarView initialData={mockCalendarData} />
    );

    // Never contain sensitive words or reason text
    expect(html).not.toContain("CS 153");
    expect(html).not.toContain("Secret Subject");
    expect(html).not.toContain("Doctor Appointment");
    expect(html).not.toContain("Family vacation");
  });

  it("renders unlinked state when student is not linked", () => {
    const unlinkedData: ClientCalendarData = {
      ...mockCalendarData,
      linked: false,
      student: undefined,
      days: [],
    };

    const html = renderToString(
      <ClientCalendarView initialData={unlinkedData} />
    );

    expect(html).toContain("No student linked yet");
    expect(html).toContain(
      "No student linked yet. Enter your student&#x27;s invite code in Settings."
    );
    expect(html).toContain("Go to settings");
  });

  it("renders warning banner when student has no free windows set", () => {
    const noFreeTimeData: ClientCalendarData = {
      ...mockCalendarData,
      hasAnyFreeTime: false,
      nextFreeWindow: null,
      days: mockCalendarData.days.map((d) => ({
        ...d,
        openSlots: [],
        freeMinutes: 0,
        freeHoursFormatted: "0h free",
      })),
    };

    const html = renderToString(
      <ClientCalendarView initialData={noFreeTimeData} />
    );

    expect(html).toContain(
      "Maria hasn&#x27;t added free time yet. You can still assign a task and they will see a warning."
    );
    expect(html).toContain("Assign task");
  });
});
