import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../prisma";
import {
  determineStudentLiveStatus,
  getStudentDashboardData,
  getClientDashboardData,
} from "./dashboard-service";
import { Role, LinkStatus, TaskStatus, TimeLogStatus } from "@prisma/client";

describe("Dashboard Service", () => {
  describe("determineStudentLiveStatus", () => {
    const classes = [{ startMinutes: 540, endMinutes: 660 }]; // 9:00 AM - 11:00 AM
    const availabilities = [{ startMinutes: 1080, endMinutes: 1260 }]; // 6:00 PM - 9:00 PM

    it("returns IN_CLASS when current time falls within class schedule", () => {
      // 10:00 AM = 600 minutes
      const result = determineStudentLiveStatus(classes, availabilities, 600);
      expect(result.state).toBe("IN_CLASS");
      expect(result.label).toBe("Currently in class");
      expect(result.description).toContain("11:00 AM");
    });

    it("returns AVAILABLE when current time falls within availability window", () => {
      // 7:00 PM = 1140 minutes
      const result = determineStudentLiveStatus(classes, availabilities, 1140);
      expect(result.state).toBe("AVAILABLE");
      expect(result.label).toBe("Available for VA work");
      expect(result.description).toContain("9:00 PM");
    });

    it("returns OFF when current time is outside both class and availability", () => {
      // 2:00 PM = 840 minutes
      const result = determineStudentLiveStatus(classes, availabilities, 840);
      expect(result.state).toBe("OFF");
      expect(result.label).toBe("Off schedule");
      expect(result.description).toContain("6:00 PM");
    });
  });

  describe("Integration: Dashboard Data Fetching", () => {
    const testStudentEmail = `test-dash-student-${Date.now()}@example.com`;
    const testClientEmail = `test-dash-client-${Date.now()}@example.com`;
    let studentId = "";
    let clientId = "";
    let createdTaskId = "";
    let createdLogId = "";

    beforeAll(async () => {
      const student = await prisma.user.create({
        data: {
          name: "Dashboard Student",
          email: testStudentEmail,
          passwordHash: "hash",
          role: Role.STUDENT,
          studentProfile: {
            create: {
              school: "Ateneo",
              course: "BS MIS",
              year: 2,
              maxHoursPerDay: 4,
            },
          },
        },
      });
      studentId = student.id;

      const client = await prisma.user.create({
        data: {
          name: "Dashboard Client",
          email: testClientEmail,
          passwordHash: "hash",
          role: Role.CLIENT,
        },
      });
      clientId = client.id;

      await prisma.clientStudentLink.create({
        data: {
          clientId,
          studentId,
          hourlyRate: 150,
          status: LinkStatus.ACTIVE,
        },
      });

      const task = await prisma.task.create({
        data: {
          clientId,
          studentId,
          title: "Dashboard Urgent Task",
          startAt: new Date(),
          dueAt: new Date(Date.now() + 86400000),
          estHours: 3.0,
          status: TaskStatus.DOING,
        },
      });
      createdTaskId = task.id;

      const log = await prisma.timeLog.create({
        data: {
          studentId,
          taskId: task.id,
          timeIn: new Date(Date.now() - 7200000),
          timeOut: new Date(),
          totalHours: 2.0,
          status: TimeLogStatus.CLOSED, // unapproved
        },
      });
      createdLogId = log.id;
    });

    afterAll(async () => {
      if (createdLogId) {
        await prisma.timeLog.deleteMany({ where: { id: createdLogId } });
      }
      if (createdTaskId) {
        await prisma.task.deleteMany({ where: { id: createdTaskId } });
      }
      if (clientId && studentId) {
        await prisma.clientStudentLink.deleteMany({ where: { clientId, studentId } });
      }
      if (studentId) {
        await prisma.studentProfile.deleteMany({ where: { userId: studentId } });
        await prisma.user.deleteMany({ where: { id: studentId } });
      }
      if (clientId) {
        await prisma.user.deleteMany({ where: { id: clientId } });
      }
    });

    it("fetches student dashboard data properly", async () => {
      const data = await getStudentDashboardData(studentId);
      expect(data.student.name).toBe("Dashboard Student");
      expect(data.student.school).toBe("Ateneo");
      expect(data.capacity.maxHoursPerDay).toBe(4);
      expect(data.linkedClient?.name).toBe("Dashboard Client");
      expect(data.linkedClient?.hourlyRate).toBe(150);
      expect(data.tasksSummary.doingCount).toBe(1);
    });

    it("fetches client dashboard data properly", async () => {
      const data = await getClientDashboardData(clientId);
      expect(data.linked).toBe(true);
      expect(data.student?.name).toBe("Dashboard Student");
      expect(data.tasksSummary.doingCount).toBe(1);
      expect(data.pendingApproval.logCount).toBe(1);
      expect(data.pendingApproval.totalHours).toBe(2.0);
      expect(data.pendingApproval.totalAmount).toBe(300); // 2h * 150
    });

    it("returns empty state for unlinked client", async () => {
      const data = await getClientDashboardData("unlinked-random-id");
      expect(data.linked).toBe(false);
      expect(data.tasksSummary.activeTasks).toHaveLength(0);
    });
  });
});

