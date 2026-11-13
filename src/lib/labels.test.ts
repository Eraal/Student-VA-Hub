import { describe, it, expect } from "vitest";
import {
  Role,
  TaskStatus,
  StudentResponse,
  TimeLogStatus,
  CorrectionStatus,
  InvoiceStatus,
  LinkStatus,
} from "@prisma/client";
import {
  ROLE_LABELS,
  TASK_STATUS_LABELS,
  STUDENT_RESPONSE_LABELS,
  TIME_LOG_STATUS_LABELS,
  CORRECTION_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  LINK_STATUS_LABELS,
  CONFLICT_TYPE_LABELS,
  NOTIFICATION_TYPE_LABELS,
  getStatusMeta,
  getResponseLabel,
  TONE_STYLES,
  Tone,
} from "./labels";

describe("Central Label Layer (labels.ts)", () => {
  const validTones: Tone[] = ["blue", "green", "red", "amber", "gray"];

  it("has a valid label and tone for every Role enum", () => {
    for (const key of Object.values(Role)) {
      const meta = ROLE_LABELS[key];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe("string");
      expect(meta.label.length).toBeGreaterThan(0);
      expect(validTones).toContain(meta.tone);
    }
  });

  it("has a valid label and tone for every TaskStatus enum", () => {
    for (const key of Object.values(TaskStatus)) {
      const meta = TASK_STATUS_LABELS[key];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe("string");
      expect(validTones).toContain(meta.tone);
    }
    expect(TASK_STATUS_LABELS.TODO.label).toBe("To do");
    expect(TASK_STATUS_LABELS.DOING.label).toBe("In progress");
    expect(TASK_STATUS_LABELS.DONE.label).toBe("Done");
  });

  it("has a valid label and tone for every StudentResponse enum", () => {
    for (const key of Object.values(StudentResponse)) {
      const meta = STUDENT_RESPONSE_LABELS[key];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe("string");
      expect(validTones).toContain(meta.tone);
    }
    expect(STUDENT_RESPONSE_LABELS.ACCEPTED.label).toBe("Accepted");
    expect(STUDENT_RESPONSE_LABELS.RESCHEDULE_REQUESTED.label).toBe(
      "Reschedule requested"
    );
  });

  it("has a valid label and tone for every TimeLogStatus enum", () => {
    for (const key of Object.values(TimeLogStatus)) {
      const meta = TIME_LOG_STATUS_LABELS[key];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe("string");
      expect(validTones).toContain(meta.tone);
    }
    expect(TIME_LOG_STATUS_LABELS.OPEN.label).toBe("In progress");
    expect(TIME_LOG_STATUS_LABELS.CLOSED.label).toBe("Awaiting approval");
    expect(TIME_LOG_STATUS_LABELS.APPROVED.label).toBe("Approved");
  });

  it("has a valid label and tone for every CorrectionStatus enum", () => {
    for (const key of Object.values(CorrectionStatus)) {
      const meta = CORRECTION_STATUS_LABELS[key];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe("string");
      expect(validTones).toContain(meta.tone);
    }
  });

  it("has a valid label and tone for every InvoiceStatus enum", () => {
    for (const key of Object.values(InvoiceStatus)) {
      const meta = INVOICE_STATUS_LABELS[key];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe("string");
      expect(validTones).toContain(meta.tone);
    }
    expect(INVOICE_STATUS_LABELS.PENDING.label).toBe("Pending");
    expect(INVOICE_STATUS_LABELS.APPROVED.label).toBe(
      "Approved, awaiting payment"
    );
    expect(INVOICE_STATUS_LABELS.PAID.label).toBe("Paid");
  });

  it("has a valid label and tone for every LinkStatus enum", () => {
    for (const key of Object.values(LinkStatus)) {
      const meta = LINK_STATUS_LABELS[key];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe("string");
      expect(validTones).toContain(meta.tone);
    }
    expect(LINK_STATUS_LABELS.ACTIVE.label).toBe("Active");
    expect(LINK_STATUS_LABELS.PENDING.label).toBe("Pending");
    expect(LINK_STATUS_LABELS.INACTIVE.label).toBe("Inactive");
  });

  it("has labels and messages for all ConflictDetector types", () => {
    const conflictKeys = [
      "CLASS_OVERLAP",
      "BLOCKED_DATE",
      "OUTSIDE_AVAILABILITY",
      "EXCEEDS_AVAILABLE_HOURS",
      "SINGLE_OPEN_LOG",
    ] as const;

    for (const key of conflictKeys) {
      const meta = CONFLICT_TYPE_LABELS[key];
      expect(meta).toBeDefined();
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.message.length).toBeGreaterThan(0);
      expect(validTones).toContain(meta.tone);
    }
  });

  it("has labels for all Notification types", () => {
    for (const key of Object.keys(NOTIFICATION_TYPE_LABELS)) {
      const meta = NOTIFICATION_TYPE_LABELS[key];
      expect(meta).toBeDefined();
      expect(validTones).toContain(meta.tone);
    }
  });

  it("resolves null and undefined gracefully to an em dash fallback", () => {
    expect(getStatusMeta(null).label).toBe("—");
    expect(getStatusMeta(undefined).label).toBe("—");
    expect(getStatusMeta("").label).toBe("—");
  });

  it("formats unknown status strings gracefully without throwing", () => {
    const meta = getStatusMeta("UNKNOWN_CUSTOM_STATUS");
    expect(meta.label).toBe("Unknown custom status");
    expect(meta.tone).toBe("gray");
  });

  describe("getResponseLabel", () => {
    describe("STUDENT viewer role", () => {
      it("returns 'Needs your response' in amber when response is null or undefined", () => {
        expect(getResponseLabel(null, Role.STUDENT)).toEqual({
          label: "Needs your response",
          tone: "amber",
          hideOnClientRows: false,
        });
        expect(getResponseLabel(undefined, Role.STUDENT)).toEqual({
          label: "Needs your response",
          tone: "amber",
          hideOnClientRows: false,
        });
        expect(getResponseLabel(null, "STUDENT")).toEqual({
          label: "Needs your response",
          tone: "amber",
          hideOnClientRows: false,
        });
      });

      it("returns 'Accepted' in green when response is ACCEPTED", () => {
        expect(getResponseLabel(StudentResponse.ACCEPTED, Role.STUDENT)).toEqual({
          label: "Accepted",
          tone: "green",
          hideOnClientRows: false,
        });
      });

      it("returns 'Reschedule requested' in amber when response is RESCHEDULE_REQUESTED", () => {
        expect(
          getResponseLabel(StudentResponse.RESCHEDULE_REQUESTED, Role.STUDENT)
        ).toEqual({
          label: "Reschedule requested",
          tone: "amber",
          hideOnClientRows: false,
        });
      });
    });

    describe("CLIENT viewer role", () => {
      it("returns 'Not accepted yet' in gray when response is null or undefined", () => {
        expect(getResponseLabel(null, Role.CLIENT)).toEqual({
          label: "Not accepted yet",
          tone: "gray",
          hideOnClientRows: false,
        });
        expect(getResponseLabel(undefined, Role.CLIENT)).toEqual({
          label: "Not accepted yet",
          tone: "gray",
          hideOnClientRows: false,
        });
        expect(getResponseLabel(null, "CLIENT")).toEqual({
          label: "Not accepted yet",
          tone: "gray",
          hideOnClientRows: false,
        });
      });

      it("returns 'Accepted' in green with hideOnClientRows true when response is ACCEPTED", () => {
        expect(getResponseLabel(StudentResponse.ACCEPTED, Role.CLIENT)).toEqual({
          label: "Accepted",
          tone: "green",
          hideOnClientRows: true,
        });
      });

      it("returns 'Wants to reschedule' in amber when response is RESCHEDULE_REQUESTED", () => {
        expect(
          getResponseLabel(StudentResponse.RESCHEDULE_REQUESTED, Role.CLIENT)
        ).toEqual({
          label: "Wants to reschedule",
          tone: "amber",
          hideOnClientRows: false,
        });
      });
    });
  });
});

