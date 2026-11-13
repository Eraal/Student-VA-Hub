import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_METADATA,
  type NotificationType,
} from "./notifications";
import { getNotificationRoute } from "./notification-routes";

describe("Notification Routes Resolution", () => {
  it("ensures every NotificationType in NOTIFICATION_METADATA has a specific route for the recipient role", () => {
    const studentTypes: NotificationType[] = [
      "TASK_ASSIGNED",
      "HOURS_APPROVED",
      "INVOICE_PAID",
      "HOURS_DISPUTED",
      "CORRECTION_APPROVED",
      "CORRECTION_REJECTED",
    ];
    const clientTypes: NotificationType[] = [
      "TASK_ACCEPTED",
      "RESCHEDULE_REQUESTED",
      "HOURS_SUBMITTED",
      "CORRECTION_REQUESTED",
    ];

    expect(NOTIFICATION_TYPES.length).toBe(studentTypes.length + clientTypes.length);

    for (const type of studentTypes) {
      expect(NOTIFICATION_METADATA[type].recipientRole).toBe(Role.STUDENT);
      const route = getNotificationRoute(Role.STUDENT, type);
      expect(route).toBeDefined();
      expect(route.startsWith("/student/")).toBe(true);
      expect(route).not.toBe("/student");
    }

    for (const type of clientTypes) {
      expect(NOTIFICATION_METADATA[type].recipientRole).toBe(Role.CLIENT);
      const route = getNotificationRoute(Role.CLIENT, type);
      expect(route).toBeDefined();
      expect(route.startsWith("/client/")).toBe(true);
      expect(route).not.toBe("/client");
    }

    for (const type of NOTIFICATION_TYPES) {
      const meta = NOTIFICATION_METADATA[type];
      const route = getNotificationRoute(meta.recipientRole, type);

      expect(route).toBeDefined();
      expect(route.length).toBeGreaterThan(0);

      // Must be a specific sub-page, NOT the root role home page
      if (meta.recipientRole === Role.STUDENT) {
        expect(route).not.toBe("/student");
        expect(route.startsWith("/student/")).toBe(true);
      } else {
        expect(route).not.toBe("/client");
        expect(route.startsWith("/client/")).toBe(true);
      }
    }
  });

  it("routes specific student notification types to expected pages", () => {
    expect(getNotificationRoute(Role.STUDENT, "TASK_ASSIGNED")).toBe("/student/tasks");
    expect(getNotificationRoute("STUDENT", "TASK_ASSIGNED")).toBe("/student/tasks");

    expect(getNotificationRoute(Role.STUDENT, "HOURS_APPROVED")).toBe("/student/earnings");
    expect(getNotificationRoute(Role.STUDENT, "INVOICE_PAID")).toBe("/student/earnings");

    expect(getNotificationRoute(Role.STUDENT, "HOURS_DISPUTED")).toBe("/student/time");
    expect(getNotificationRoute(Role.STUDENT, "CORRECTION_APPROVED")).toBe("/student/time");
    expect(getNotificationRoute(Role.STUDENT, "CORRECTION_REJECTED")).toBe("/student/time");
  });

  it("routes specific client notification types to expected pages", () => {
    expect(getNotificationRoute(Role.CLIENT, "TASK_ACCEPTED")).toBe("/client/tasks");
    expect(getNotificationRoute("CLIENT", "TASK_ACCEPTED")).toBe("/client/tasks");
    expect(getNotificationRoute(Role.CLIENT, "RESCHEDULE_REQUESTED")).toBe("/client/tasks");

    expect(getNotificationRoute(Role.CLIENT, "HOURS_SUBMITTED")).toBe("/client/timesheets");
    expect(getNotificationRoute(Role.CLIENT, "CORRECTION_REQUESTED")).toBe("/client/timesheets");
  });

  it("falls back to Home for unknown or legacy notification types", () => {
    expect(getNotificationRoute(Role.STUDENT, "UNKNOWN_TYPE")).toBe("/student");
    expect(getNotificationRoute("STUDENT", "LEGACY_EVENT")).toBe("/student");
    expect(getNotificationRoute(Role.STUDENT, "")).toBe("/student");

    expect(getNotificationRoute(Role.CLIENT, "UNKNOWN_TYPE")).toBe("/client");
    expect(getNotificationRoute("CLIENT", "LEGACY_EVENT")).toBe("/client");
    expect(getNotificationRoute(Role.CLIENT, "")).toBe("/client");
  });
});

