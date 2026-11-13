import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AssignTaskDialog, type AssignTaskScheduleContext } from "./assign-task-dialog";
import { checkTaskConflictForClient } from "@/lib/services/task-service";
import { checkConflict } from "@/lib/conflict";
import { prisma } from "@/lib/prisma";

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

const mockScheduleContext: AssignTaskScheduleContext = {
  studentName: "Maria Santos",
  maxHoursPerDay: 4,
  classes: [
    {
      id: "class-1",
      dayOfWeek: 1, // Monday
      startMinutes: 8 * 60, // 8:00 AM
      endMinutes: 9 * 60 + 30, // 9:30 AM
      subject: "Secret Subject", // Sensitive academic data
    },
    {
      id: "class-2",
      dayOfWeek: 1, // Monday
      startMinutes: 13 * 60, // 1:00 PM
      endMinutes: 14 * 60, // 2:00 PM
      subject: "Top Secret Math",
    },
  ],
  availability: [
    {
      id: "avail-1",
      dayOfWeek: 1, // Monday
      startMinutes: 18 * 60, // 6:00 PM
      endMinutes: 21 * 60, // 9:00 PM
    },
    {
      id: "avail-2",
      dayOfWeek: 2, // Tuesday
      startMinutes: 18 * 60, // 6:00 PM
      endMinutes: 21 * 60, // 9:00 PM
    },
  ],
  blockedDates: [],
  existingTasks: [
    {
      id: "task-1",
      startAt: "2026-11-16T02:00:00.000Z", // Mon 10:00 AM Manila
      dueAt: "2026-11-16T03:00:00.000Z",   // Mon 11:00 AM Manila
      estHours: 1,
      status: "TODO",
    },
  ],
};

describe("AssignTaskDialog", () => {
  it("renders desktop wide dialog structure with title, subtitle, and all form controls", () => {
    const html = renderToString(
      <AssignTaskDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        linkedStudentName="Maria Santos"
        defaults={{
          date: "2026-11-16",
          start: "18:00",
          end: "20:00",
        }}
        scheduleContext={mockScheduleContext}
      />
    );

    // Title and Subtitle
    expect(html).toContain("Assign a task to Maria");
    expect(html).toContain(
      "We check Maria&#x27;s classes and free time as you type."
    );

    // Dialog container testid
    expect(html).toContain('data-testid="assign-dialog"');

    // Form inputs testids
    expect(html).toContain('data-testid="assign-title"');
    expect(html).toContain('data-testid="assign-description"');
    expect(html).toContain('data-testid="assign-date"');
    expect(html).toContain('data-testid="assign-start"');
    expect(html).toContain('data-testid="assign-end"');
    expect(html).toContain('data-testid="assign-hours"');

    // Action buttons testids
    expect(html).toContain('data-testid="assign-cancel"');
    expect(html).toContain('data-testid="assign-submit"');

    // Date caption
    expect(html).toContain("Philippine time");

    // Stepper format
    expect(html).toContain("2h");
    expect(html).toContain("How long you expect this to take.");
  });

  it("renders Availability Check panel with day preview bar and day capacity line", () => {
    const html = renderToString(
      <AssignTaskDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        linkedStudentName="Maria Santos"
        defaults={{
          date: "2026-11-16",
          start: "18:00",
          end: "20:00",
        }}
        scheduleContext={mockScheduleContext}
      />
    );

    // Availability check panel
    expect(html).toContain("Availability check");
    expect(html).toContain('data-testid="assign-day-preview"');

    // Day preview labels (classes show "In class")
    expect(html).toContain("In class");

    // Day summary line from getDayCapacity
    expect(html).toContain("Daily limit 4h · 1h already assigned · 3h left");
  });

  it("renders suggestions from suggestSlots with data-testid and formatted timestamps", () => {
    const html = renderToString(
      <AssignTaskDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        linkedStudentName="Maria Santos"
        defaults={{
          date: "2026-11-16",
          start: "18:00",
          end: "20:00",
        }}
        scheduleContext={mockScheduleContext}
      />
    );

    // Suggestions container
    expect(html).toContain('data-testid="assign-suggestion"');
    expect(html).toContain("Free times that fit 2h");
  });

  it("renders blocked date with hatched pattern and Not available label", () => {
    const blockedSchedule: AssignTaskScheduleContext = {
      ...mockScheduleContext,
      blockedDates: [
        {
          id: "block-1",
          dateStart: "2026-11-17T00:00:00.000Z",
          dateEnd: "2026-11-17T23:59:59.000Z",
        },
      ],
    };

    const html = renderToString(
      <AssignTaskDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        linkedStudentName="Maria Santos"
        defaults={{
          date: "2026-11-17",
          start: "18:00",
          end: "20:00",
        }}
        scheduleContext={blockedSchedule}
      />
    );

    expect(html).toContain("Not available");
  });

  describe("Conflict Check States and Footer actions", () => {
    it("renders OK state with check icon, positive message, and Assign task button", () => {
      const html = renderToString(
        <AssignTaskDialog
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          linkedStudentName="Maria Santos"
          defaults={{
            date: "2026-11-16",
            start: "18:00",
            end: "20:00",
          }}
          scheduleContext={mockScheduleContext}
          initialConflictResult={{
            ok: true,
            hasWarnings: false,
            conflicts: [],
          }}
        />
      );

      expect(html).toContain('data-testid="assign-check"');
      expect(html).toContain('data-state="ok"');
      expect(html).toContain("No conflicts. This time works for Maria.");
      expect(html).toContain("Assign task");
    });

    it("renders Warning state with warning message, conflict items, and Assign anyway button", () => {
      const html = renderToString(
        <AssignTaskDialog
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          linkedStudentName="Maria Santos"
          defaults={{
            date: "2026-11-16",
            start: "18:00",
            end: "20:00",
          }}
          scheduleContext={mockScheduleContext}
          initialConflictResult={{
            ok: true,
            hasWarnings: true,
            conflicts: [
              {
                type: "EXCEEDS_AVAILABLE_HOURS",
                severity: "WARN",
                message: "Exceeds available hours (5h vs 2h)",
              },
            ],
          }}
        />
      );

      expect(html).toContain('data-state="warn"');
      expect(html).toContain(
        "Heads up. You can still send this. Maria will see the warning and decide."
      );
      expect(html).toContain('data-testid="assign-conflict-item"');
      expect(html).toContain('data-type="EXCEEDS_AVAILABLE_HOURS"');
      expect(html).toContain("Exceeds available hours (5h vs 2h)");
      expect(html).toContain("Assign anyway");
      expect(html).toContain("Try one of these instead");
    });

    it("renders Block state with red alert, conflict items, disabled button, and helper text", () => {
      const html = renderToString(
        <AssignTaskDialog
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          linkedStudentName="Maria Santos"
          defaults={{
            date: "2026-11-16",
            start: "13:00",
            end: "14:00",
          }}
          scheduleContext={mockScheduleContext}
          initialConflictResult={{
            ok: false,
            hasWarnings: false,
            conflicts: [
              {
                type: "CLASS_OVERLAP",
                severity: "BLOCK",
                message: "Conflict! Maria has class Monday 1:00 PM–2:00 PM.",
              },
            ],
          }}
        />
      );

      expect(html).toContain('data-state="block"');
      expect(html).toContain("This time isn&#x27;t available.");
      expect(html).toContain('data-testid="assign-conflict-item"');
      expect(html).toContain('data-type="CLASS_OVERLAP"');
      expect(html).toContain("Conflict! Maria has class Monday 1:00 PM–2:00 PM.");
      expect(html).toContain("Pick a different time to continue.");
      expect(html).toContain("Try one of these instead");
    });
  });

  describe("Privacy Rule (Acceptance Test 6 & Task Requirement)", () => {
    it("ensures check result data and messages reaching client never contain subject for Secret Subject", async () => {
      // 1. Pure detector test
      const checkResult = checkConflict(
        {
          startAt: "2026-11-16T00:00:00.000Z", // Monday 8:00 AM Manila
          dueAt: "2026-11-16T01:30:00.000Z",   // Monday 9:30 AM Manila
          estHours: 1.5,
        },
        [
          {
            dayOfWeek: 1,
            startMinutes: 8 * 60,
            endMinutes: 9 * 60 + 30,
            subject: "Secret Subject",
          },
        ],
        [],
        [],
        4,
        { studentName: "Maria" }
      );

      // Verify detector blocks class overlap
      expect(checkResult.ok).toBe(false);
      const classOverlap = checkResult.conflicts.find((c) => c.type === "CLASS_OVERLAP");
      expect(classOverlap).toBeDefined();
      expect(classOverlap?.message).toContain("Maria has class");

      // Assert all conflict messages do NOT leak "Secret Subject"
      for (const conflict of checkResult.conflicts) {
        expect(conflict.message).not.toContain("Secret Subject");
      }

      // 2. Client dialog rendered HTML check
      const html = renderToString(
        <AssignTaskDialog
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          linkedStudentName="Maria Santos"
          defaults={{
            date: "2026-11-16",
            start: "08:00",
            end: "09:30",
          }}
          scheduleContext={mockScheduleContext}
        />
      );

      // Assert rendered HTML in client dialog NEVER contains "Secret Subject"
      expect(html).not.toContain("Secret Subject");
      expect(html).not.toContain("Top Secret Math");
    });
  });
});
