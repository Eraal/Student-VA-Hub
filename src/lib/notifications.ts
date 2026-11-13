import * as React from "react";
import { Role, Prisma } from "@prisma/client";
import { publishLiveUpdate } from "./live-updates";
import type { Tone } from "./labels";
export type { Tone };
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Bell,
} from "lucide-react";

export const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "TASK_ACCEPTED",
  "RESCHEDULE_REQUESTED",
  "HOURS_SUBMITTED",
  "HOURS_APPROVED",
  "HOURS_DISPUTED",
  "CORRECTION_REQUESTED",
  "CORRECTION_APPROVED",
  "CORRECTION_REJECTED",
  "INVOICE_PAID",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationMetadata {
  label: string;
  tone: Tone;
  icon: string;
  recipientRole: Role;
}

export const NOTIFICATION_METADATA: Record<NotificationType, NotificationMetadata> = {
  TASK_ASSIGNED: {
    label: "Task assigned",
    tone: "blue",
    icon: "briefcase",
    recipientRole: Role.STUDENT,
  },
  TASK_ACCEPTED: {
    label: "Task accepted",
    tone: "green",
    icon: "check-circle",
    recipientRole: Role.CLIENT,
  },
  RESCHEDULE_REQUESTED: {
    label: "Reschedule requested",
    tone: "amber",
    icon: "alert-circle",
    recipientRole: Role.CLIENT,
  },
  HOURS_SUBMITTED: {
    label: "Hours submitted",
    tone: "blue",
    icon: "clock",
    recipientRole: Role.CLIENT,
  },
  HOURS_APPROVED: {
    label: "Hours approved",
    tone: "green",
    icon: "check-circle",
    recipientRole: Role.STUDENT,
  },
  HOURS_DISPUTED: {
    label: "Hours disputed",
    tone: "amber",
    icon: "alert-triangle",
    recipientRole: Role.STUDENT,
  },
  CORRECTION_REQUESTED: {
    label: "Correction requested",
    tone: "amber",
    icon: "alert-circle",
    recipientRole: Role.CLIENT,
  },
  CORRECTION_APPROVED: {
    label: "Correction approved",
    tone: "green",
    icon: "check-circle",
    recipientRole: Role.STUDENT,
  },
  CORRECTION_REJECTED: {
    label: "Correction rejected",
    tone: "amber",
    icon: "alert-triangle",
    recipientRole: Role.STUDENT,
  },
  INVOICE_PAID: {
    label: "Invoice paid",
    tone: "green",
    icon: "check-circle",
    recipientRole: Role.STUDENT,
  },
};

/**
 * Derived map of labels and tones for each NotificationType.
 */
export const NOTIFICATION_TYPE_LABELS: Record<string, { label: string; tone: Tone }> =
  Object.fromEntries(
    Object.entries(NOTIFICATION_METADATA).map(([type, meta]) => [
      type,
      { label: meta.label, tone: meta.tone },
    ])
  );

/**
 * Resolves metadata for a notification type, falling back to a neutral "Update" meta for legacy/unknown types.
 */
export function getNotificationMeta(type: string): NotificationMetadata {
  if (type in NOTIFICATION_METADATA) {
    return NOTIFICATION_METADATA[type as NotificationType];
  }
  return {
    label: "Update",
    tone: "gray",
    icon: "bell",
    recipientRole: Role.STUDENT,
  };
}

/**
 * Returns a human-friendly label for any notification type string.
 * Legacy or unknown types return "Update", never the raw string.
 */
export function getNotificationLabel(type: string): string {
  return getNotificationMeta(type).label;
}

/**
 * Renders an icon element for any notification type.
 * Unknown or legacy types render a neutral Bell icon.
 */
export function getNotificationIcon(type: string, className?: string): React.ReactNode {
  const meta = getNotificationMeta(type);
  const defaultClass =
    meta.tone === "blue"
      ? "size-5 text-[#2563EB]"
      : meta.tone === "green"
        ? "size-5 text-[#16A34A]"
        : meta.tone === "amber"
          ? "size-5 text-[#D97706]"
          : meta.tone === "red"
            ? "size-5 text-[#DC2626]"
            : "size-5 text-[#0F172A]";

  const iconClassName = className ?? defaultClass;

  switch (meta.icon) {
    case "briefcase":
      return React.createElement(Briefcase, { className: iconClassName });
    case "check-circle":
      return React.createElement(CheckCircle2, { className: iconClassName });
    case "clock":
      return React.createElement(Clock, { className: iconClassName });
    case "alert-circle":
      return React.createElement(AlertCircle, { className: iconClassName });
    case "alert-triangle":
      return React.createElement(AlertTriangle, { className: iconClassName });
    case "bell":
    default:
      return React.createElement(Bell, { className: iconClassName });
  }
}

export interface CreateNotificationParams {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  message: string;
}

/**
 * Creates a notification inside an active database transaction.
 * Throws if called with the global Prisma client instead of a transaction client,
 * or if the actor and recipient are the same user.
 */
export async function createNotification(
  tx: Prisma.TransactionClient,
  params: CreateNotificationParams
) {
  if (params.recipientId === params.actorId) {
    throw new Error("Recipient and actor cannot be the same user.");
  }

  // Guard against passing global prisma instance
  if ("$transaction" in tx && typeof (tx as any).$transaction === "function") {
    throw new Error("createNotification must be called with a transaction client, not the global prisma instance.");
  }

  const notification = await tx.notification.create({
    data: {
      userId: params.recipientId,
      type: params.type,
      message: params.message,
    },
  });

  publishLiveUpdate([params.recipientId], "notifications");

  return notification;
}

