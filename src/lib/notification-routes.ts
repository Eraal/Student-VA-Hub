import { Role } from "@prisma/client";

/**
 * Returns the destination route for a notification based on its type and recipient role.
 * Unknown or legacy notification types fall back to the role's Home page.
 */
export function getNotificationRoute(
  role: Role | "STUDENT" | "CLIENT" | string,
  type: string
): string {
  const isStudent = (role as string) === Role.STUDENT;

  if (isStudent) {
    switch (type) {
      case "TASK_ASSIGNED":
        return "/student/tasks";
      case "HOURS_APPROVED":
      case "INVOICE_PAID":
        return "/student/earnings";
      case "HOURS_DISPUTED":
      case "CORRECTION_APPROVED":
      case "CORRECTION_REJECTED":
        return "/student/time";
      default:
        return "/student";
    }
  } else {
    switch (type) {
      case "TASK_ACCEPTED":
      case "RESCHEDULE_REQUESTED":
        return "/client/tasks";
      case "HOURS_SUBMITTED":
      case "CORRECTION_REQUESTED":
        return "/client/timesheets";
      default:
        return "/client";
    }
  }
}
