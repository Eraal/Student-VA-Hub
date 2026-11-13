import * as React from "react";
import {
  Role,
  TaskStatus,
  StudentResponse,
  TimeLogStatus,
  CorrectionStatus,
  InvoiceStatus,
  LinkStatus,
} from "@prisma/client";
import { cn } from "@/lib/utils";

export type Tone = "blue" | "green" | "red" | "amber" | "gray";

export interface StatusMeta {
  label: string;
  tone: Tone;
}

// ---------------------------------------------------------------------------
// 1. Prisma Enum Typed Records (Build fails if a value has no label)
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<Role, StatusMeta> = {
  [Role.STUDENT]: { label: "Student VA", tone: "blue" },
  [Role.CLIENT]: { label: "Client", tone: "green" },
};

export const TASK_STATUS_LABELS: Record<TaskStatus, StatusMeta> = {
  [TaskStatus.TODO]: { label: "To do", tone: "gray" },
  [TaskStatus.DOING]: { label: "In progress", tone: "blue" },
  [TaskStatus.DONE]: { label: "Done", tone: "green" },
};

export const STUDENT_RESPONSE_LABELS: Record<StudentResponse, StatusMeta> = {
  [StudentResponse.ACCEPTED]: { label: "Accepted", tone: "green" },
  [StudentResponse.RESCHEDULE_REQUESTED]: {
    label: "Reschedule requested",
    tone: "amber",
  },
};

export interface ResponseLabelMeta {
  label: string;
  tone: Tone;
  hideOnClientRows: boolean;
}

/**
 * Returns role-aware status label, tone, and visibility for student responses.
 *
 * Student view:
 *   - null / undefined: "Needs your response" (amber)
 *   - ACCEPTED: "Accepted" (green)
 *   - RESCHEDULE_REQUESTED: "Reschedule requested" (amber)
 *
 * Client view:
 *   - null / undefined: "Not accepted yet" (gray)
 *   - ACCEPTED: "Accepted" (green, hidden on compact client rows to reduce noise)
 *   - RESCHEDULE_REQUESTED: "Wants to reschedule" (amber)
 */
export function getResponseLabel(
  response: StudentResponse | string | null | undefined,
  viewerRole: Role | "STUDENT" | "CLIENT"
): ResponseLabelMeta {
  const isStudent = String(viewerRole).toUpperCase() === "STUDENT";

  if (isStudent) {
    if (response === StudentResponse.ACCEPTED || response === "ACCEPTED") {
      return { label: "Accepted", tone: "green", hideOnClientRows: false };
    }
    if (
      response === StudentResponse.RESCHEDULE_REQUESTED ||
      response === "RESCHEDULE_REQUESTED"
    ) {
      return {
        label: "Reschedule requested",
        tone: "amber",
        hideOnClientRows: false,
      };
    }
    return {
      label: "Needs your response",
      tone: "amber",
      hideOnClientRows: false,
    };
  }

  // Client role
  if (response === StudentResponse.ACCEPTED || response === "ACCEPTED") {
    return { label: "Accepted", tone: "green", hideOnClientRows: true };
  }
  if (
    response === StudentResponse.RESCHEDULE_REQUESTED ||
    response === "RESCHEDULE_REQUESTED"
  ) {
    return {
      label: "Wants to reschedule",
      tone: "amber",
      hideOnClientRows: false,
    };
  }
  return {
    label: "Not accepted yet",
    tone: "gray",
    hideOnClientRows: false,
  };
}

export const TIME_LOG_STATUS_LABELS: Record<TimeLogStatus, StatusMeta> = {
  [TimeLogStatus.OPEN]: { label: "In progress", tone: "green" },
  [TimeLogStatus.CLOSED]: { label: "Awaiting approval", tone: "amber" },
  [TimeLogStatus.APPROVED]: { label: "Approved", tone: "green" },
};

export const CORRECTION_STATUS_LABELS: Record<CorrectionStatus, StatusMeta> = {
  [CorrectionStatus.PENDING]: { label: "Pending", tone: "amber" },
  [CorrectionStatus.APPROVED]: { label: "Approved", tone: "green" },
  [CorrectionStatus.REJECTED]: { label: "Rejected", tone: "red" },
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, StatusMeta> = {
  [InvoiceStatus.PENDING]: { label: "Pending", tone: "amber" },
  [InvoiceStatus.APPROVED]: {
    label: "Approved, awaiting payment",
    tone: "blue",
  },
  [InvoiceStatus.PAID]: { label: "Paid", tone: "green" },
};

export const LINK_STATUS_LABELS: Record<LinkStatus, StatusMeta> = {
  [LinkStatus.ACTIVE]: { label: "Active", tone: "green" },
  [LinkStatus.PENDING]: { label: "Pending", tone: "amber" },
  [LinkStatus.INACTIVE]: { label: "Inactive", tone: "gray" },
};

// ---------------------------------------------------------------------------
// 2. Conflict Detector Types (SPEC Section 6)
// ---------------------------------------------------------------------------

export type ConflictDetectorType =
  | "CLASS_OVERLAP"
  | "BLOCKED_DATE"
  | "OUTSIDE_AVAILABILITY"
  | "EXCEEDS_AVAILABLE_HOURS"
  | "SINGLE_OPEN_LOG";

export const CONFLICT_TYPE_LABELS: Record<
  ConflictDetectorType,
  StatusMeta & { message: string }
> = {
  CLASS_OVERLAP: {
    label: "Class overlap",
    message: "Class overlap with student's schedule",
    tone: "red",
  },
  BLOCKED_DATE: {
    label: "Blocked date",
    message: "Student is unavailable during this period",
    tone: "red",
  },
  OUTSIDE_AVAILABILITY: {
    label: "Outside available hours",
    message: "Outside set availability hours",
    tone: "amber",
  },
  EXCEEDS_AVAILABLE_HOURS: {
    label: "Exceeds available hours",
    message: "Exceeds daily available capacity",
    tone: "amber",
  },
  SINGLE_OPEN_LOG: {
    label: "Active timer running",
    message: "Close active timer first",
    tone: "red",
  },
};

// ---------------------------------------------------------------------------
// 3. Notification Types (Derived from notifications.ts)
// ---------------------------------------------------------------------------

import { NOTIFICATION_TYPE_LABELS } from "./notifications";
export { NOTIFICATION_TYPE_LABELS };

// ---------------------------------------------------------------------------
// 4. Tone to Tailwind Class mapping adhering to Neo-Brutalist design
// ---------------------------------------------------------------------------

export const TONE_STYLES: Record<Tone, string> = {
  blue: "border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] shadow-[1.5px_1.5px_0px_0px_#2563EB]",
  green: "border-[#16A34A] bg-[#F0FDF4] text-[#166534] shadow-[1.5px_1.5px_0px_0px_#16A34A]",
  red: "border-[#DC2626] bg-[#FEF2F2] text-[#991B1B] shadow-[1.5px_1.5px_0px_0px_#DC2626]",
  amber: "border-[#D97706] bg-[#FFFBEB] text-[#92400E] shadow-[1.5px_1.5px_0px_0px_#D97706]",
  gray: "border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]",
};

// ---------------------------------------------------------------------------
// 5. Universal Resolver for Status Meta
// ---------------------------------------------------------------------------

export type AnyStatus =
  | Role
  | TaskStatus
  | StudentResponse
  | TimeLogStatus
  | CorrectionStatus
  | InvoiceStatus
  | LinkStatus
  | ConflictDetectorType
  | string
  | null
  | undefined;

export function getStatusMeta(status: AnyStatus): StatusMeta {
  if (!status) {
    return { label: "—", tone: "gray" };
  }

  if (status in ROLE_LABELS) return ROLE_LABELS[status as Role];
  if (status in TASK_STATUS_LABELS)
    return TASK_STATUS_LABELS[status as TaskStatus];
  if (status in STUDENT_RESPONSE_LABELS)
    return STUDENT_RESPONSE_LABELS[status as StudentResponse];
  if (status in TIME_LOG_STATUS_LABELS)
    return TIME_LOG_STATUS_LABELS[status as TimeLogStatus];
  if (status in CORRECTION_STATUS_LABELS)
    return CORRECTION_STATUS_LABELS[status as CorrectionStatus];
  if (status in INVOICE_STATUS_LABELS)
    return INVOICE_STATUS_LABELS[status as InvoiceStatus];
  if (status in LINK_STATUS_LABELS)
    return LINK_STATUS_LABELS[status as LinkStatus];
  if (status in CONFLICT_TYPE_LABELS)
    return CONFLICT_TYPE_LABELS[status as ConflictDetectorType];
  if (status in NOTIFICATION_TYPE_LABELS)
    return NOTIFICATION_TYPE_LABELS[status];

  if (status === "DISPUTED" || status === "disputed") {
    return { label: "Disputed", tone: "amber" };
  }

  // Fallback for unknown strings
  const readable = status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
  return { label: readable, tone: "gray" };
}

// ---------------------------------------------------------------------------
// 6. StatusBadge Component
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: AnyStatus;
  overrideLabel?: string;
  className?: string;
}

export function StatusBadge({
  status,
  overrideLabel,
  className,
}: StatusBadgeProps) {
  const meta = getStatusMeta(status);
  const toneClass = TONE_STYLES[meta.tone];

  return React.createElement(
    "span",
    {
      className: cn(
        "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold transition-all",
        toneClass,
        className
      ),
    },
    overrideLabel ?? meta.label
  );
}
