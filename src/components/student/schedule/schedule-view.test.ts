import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ScheduleView } from "./schedule-view";
import { ClassesTab } from "./classes-tab";
import { AvailabilityTab } from "./availability-tab";
import { ClassDetailsDialog } from "./class-details-dialog";
import { DeleteClassDialog } from "./delete-class-dialog";
import { AvailabilityDetailsDialog } from "./availability-details-dialog";
import { DeleteAvailabilityDialog } from "./delete-availability-dialog";
import {
  StudentScheduleData,
  FormattedClass,
  FormattedAvailability,
  FormattedBlockedDate,
} from "@/lib/services/schedule-service";
import { formatHours } from "@/lib/format";

// Mock actions
vi.mock("@/lib/actions/schedule", () => ({
  addClassAction: vi.fn(),
  updateClassAction: vi.fn(),
  deleteClassAction: vi.fn(),
  addAvailabilityAction: vi.fn(),
  deleteAvailabilityAction: vi.fn(),
  updateMaxHoursAction: vi.fn(),
  addBlockedDateAction: vi.fn(),
  deleteBlockedDateAction: vi.fn(),
}));

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

describe("ScheduleView and ClassesTab Redesign", () => {
  const sampleClasses: FormattedClass[] = [
    {
      id: "class-1",
      studentId: "student-1",
      subject: "CS 312: Algorithms",
      dayOfWeek: 1, // Monday
      startMinutes: 540, // 9:00 AM
      endMinutes: 630, // 10:30 AM (1h 30m)
      startTime: "9:00 AM",
      endTime: "10:30 AM",
      duration: "1h 30m",
    },
    {
      id: "class-2",
      studentId: "student-1",
      subject: "Math 101: Calculus",
      dayOfWeek: 3, // Wednesday
      startMinutes: 780, // 1:00 PM
      endMinutes: 840, // 2:00 PM (1h)
      startTime: "1:00 PM",
      endTime: "2:00 PM",
      duration: "1h",
    },
  ];

  const sampleAvailabilities: FormattedAvailability[] = [
    {
      id: "avail-1",
      studentId: "student-1",
      dayOfWeek: 1, // Monday
      startMinutes: 1080, // 6:00 PM
      endMinutes: 1260, // 9:00 PM (3h)
      startTime: "6:00 PM",
      endTime: "9:00 PM",
      duration: "3h",
    },
    {
      id: "avail-2",
      studentId: "student-1",
      dayOfWeek: 5, // Friday
      startMinutes: 840, // 2:00 PM
      endMinutes: 1080, // 6:00 PM (4h)
      startTime: "2:00 PM",
      endTime: "6:00 PM",
      duration: "4h",
    },
  ];

  const sampleBlockedDates: FormattedBlockedDate[] = [
    {
      id: "blocked-1",
      studentId: "student-1",
      dateStart: new Date("2026-11-20T00:00:00Z"),
      dateEnd: new Date("2026-11-22T00:00:00Z"),
      reason: "Midterm Exams",
    },
  ];

  const mockData: StudentScheduleData = {
    classes: sampleClasses,
    availabilities: sampleAvailabilities,
    maxHoursPerDay: 4,
    blockedDates: sampleBlockedDates,
  };

  it("renders redesigned Schedule header with title, subtitle, and primary Add class button on classes tab", () => {
    const html = renderToString(React.createElement(ScheduleView, { initialData: mockData }));

    expect(html).toContain("Schedule");
    expect(html).toContain("Your classes are blocked off, so clients can&#x27;t assign tasks during them.");
    expect(html).toContain('data-testid="schedule-add-class"');
    // Ensure old jargon chips are removed
    expect(html).not.toContain("Class (Hard Block)");
    expect(html).not.toContain("UTC+8 (Manila)");
  });

  it("renders Summary Strip with 3 tiles: Classes this week, Time in class, Next class", () => {
    const html = renderToString(React.createElement(ScheduleView, { initialData: mockData }));

    expect(html).toContain("Classes this week");
    expect(html).toContain("2"); // 2 classes
    expect(html).toContain("Time in class");
    // Total hours: 1.5h + 1h = 2.5h -> "2h 30m"
    expect(html).toContain(formatHours(2.5));
    expect(html).toContain("Next class");
  });

  it("renders week grid with data-testid attributes for view-toggle, day-column, and class-block", () => {
    const html = renderToString(React.createElement(ScheduleView, { initialData: mockData }));

    expect(html).toContain('data-testid="schedule-view-toggle"');
    expect(html).toContain('data-testid="schedule-day-column"');
    expect(html).toContain('data-testid="schedule-class-block"');
    expect(html).toContain('data-day="1"');
    expect(html).toContain('data-start="9:00 AM"');
    expect(html).toContain("Times shown in Philippine time");
  });

  it("renders empty state when there are no classes with the exact required copy", () => {
    const emptyData: StudentScheduleData = {
      classes: [],
      availabilities: [],
      maxHoursPerDay: 4,
      blockedDates: [],
    };
    const html = renderToString(React.createElement(ScheduleView, { initialData: emptyData }));

    expect(html).toContain("No classes yet");
    expect(html).toContain("No classes yet. Add your classes so clients can&#x27;t book over them.");
    expect(html).toContain('data-testid="schedule-add-class"');
  });

  it("renders ClassDetailsDialog with Edit and Delete testids", () => {
    const html = renderToString(
      React.createElement(ClassDetailsDialog, {
        isOpen: true,
        onClose: vi.fn(),
        classItem: sampleClasses[0],
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      })
    );

    expect(html).toContain('data-testid="schedule-class-edit"');
    expect(html).toContain('data-testid="schedule-class-delete"');
    expect(html).toContain("CS 312: Algorithms");
  });

  it("renders DeleteClassDialog with destructive red schedule-delete-confirm button", () => {
    const html = renderToString(
      React.createElement(DeleteClassDialog, {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        classItem: sampleClasses[0],
        isDeleting: false,
      })
    );

    expect(html).toContain('data-testid="schedule-delete-confirm"');
    expect(html).toContain("Delete class");
    expect(html).toContain("CS 312: Algorithms");
  });

  it("automatically enables weekend when class falls on Saturday or Sunday", () => {
    const weekendClasses: FormattedClass[] = [
      ...sampleClasses,
      {
        id: "class-sat",
        studentId: "student-1",
        subject: "Weekend Lab",
        dayOfWeek: 6, // Saturday
        startMinutes: 600,
        endMinutes: 720,
        startTime: "10:00 AM",
        endTime: "12:00 PM",
        duration: "2h",
      },
    ];

    const weekendData: StudentScheduleData = {
      ...mockData,
      classes: weekendClasses,
    };

    const html = renderToString(React.createElement(ScheduleView, { initialData: weekendData }));
    expect(html).toContain("Saturday");
  });

  // --- Availability Tab Tests ---

  it("renders AvailabilityTab with summary strip, daily hour limit stepper, presets, and save button", () => {
    const html = renderToString(
      React.createElement(AvailabilityTab, {
        initialAvailabilities: sampleAvailabilities,
        classes: sampleClasses,
        initialMaxHours: 4,
        initialBlockedDates: sampleBlockedDates,
      })
    );

    expect(html).toContain("Free hours per week");
    // 3h + 4h = 7h
    expect(html).toContain(formatHours(7));
    expect(html).toContain("Daily hour limit");
    expect(html).toContain("Next free window");

    // Daily hour limit stepper and presets
    expect(html).toContain('data-testid="availability-limit-stepper"');
    expect(html).toContain('data-testid="availability-limit-save"');
    expect(html).toContain('data-testid="availability-limit-preset"');
    expect(html).toContain('data-hours="4"');
  });

  it("renders green availability window blocks in the shared week grid with testids and faint classes", () => {
    const html = renderToString(
      React.createElement(AvailabilityTab, {
        initialAvailabilities: sampleAvailabilities,
        classes: sampleClasses,
        initialMaxHours: 4,
        initialBlockedDates: sampleBlockedDates,
      })
    );

    // Green availability window blocks
    expect(html).toContain('data-testid="availability-window-block"');
    expect(html).toContain('data-day="1"');
    expect(html).toContain('data-start="6:00 PM"');

    // Faint read-only class blocks rendered in background
    expect(html).toContain("Class");

    // Grid controls
    expect(html).toContain('data-testid="schedule-view-toggle"');
    expect(html).toContain('data-testid="schedule-day-column"');
    expect(html).toContain("Times shown in Philippine time");
  });

  it("renders blocked dates section with blocked-date-add and blocked-date-row testids", () => {
    const html = renderToString(
      React.createElement(AvailabilityTab, {
        initialAvailabilities: sampleAvailabilities,
        classes: sampleClasses,
        initialMaxHours: 4,
        initialBlockedDates: sampleBlockedDates,
      })
    );

    expect(html).toContain("Unavailable dates");
    expect(html).toContain('data-testid="blocked-date-add"');
    expect(html).toContain('data-testid="blocked-date-row"');
    expect(html).toContain("Midterm Exams");
  });

  it("renders AvailabilityDetailsDialog with Edit and Delete testids", () => {
    const html = renderToString(
      React.createElement(AvailabilityDetailsDialog, {
        isOpen: true,
        onClose: vi.fn(),
        windowItem: sampleAvailabilities[0],
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      })
    );

    expect(html).toContain('data-testid="availability-window-edit"');
    expect(html).toContain('data-testid="availability-window-delete"');
    expect(html).toContain("6:00 PM");
    expect(html).toContain("9:00 PM");
  });

  it("renders DeleteAvailabilityDialog with destructive red availability-delete-confirm button", () => {
    const html = renderToString(
      React.createElement(DeleteAvailabilityDialog, {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        windowItem: sampleAvailabilities[0],
        isDeleting: false,
      })
    );

    expect(html).toContain('data-testid="availability-delete-confirm"');
    expect(html).toContain("Delete Free Window");
  });

  it("renders empty state when there are no free windows with exact required copy", () => {
    const html = renderToString(
      React.createElement(AvailabilityTab, {
        initialAvailabilities: [],
        classes: sampleClasses,
        initialMaxHours: 4,
        initialBlockedDates: [],
      })
    );

    expect(html).toContain("No free windows yet");
    expect(html).toContain("No free windows yet. Add the hours you&#x27;re open to take VA tasks.");
    expect(html).toContain('data-testid="availability-add-window"');
  });
});
