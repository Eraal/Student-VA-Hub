import { describe, it, expect, beforeEach } from "vitest";
import {
  getStudentInviteDetails,
  generateNewInviteCode,
  linkStudentToClient,
  updateClientHourlyRate,
  updateUserProfile,
} from "./invite-service";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

describe("invite-service", () => {
  const studentEmail = "test-invite-student@example.com";
  const clientEmail = "test-invite-client@example.com";
  const otherClientEmail = "test-other-client@example.com";

  let studentId: string;
  let clientId: string;
  let otherClientId: string;

  beforeEach(async () => {
    // Clean up
    await prisma.clientStudentLink.deleteMany({
      where: {
        OR: [
          { client: { email: { in: [clientEmail, otherClientEmail] } } },
          { student: { email: studentEmail } },
        ],
      },
    });

    await prisma.inviteCode.deleteMany({
      where: {
        OR: [
          { student: { email: studentEmail } },
          { usedByClient: { email: { in: [clientEmail, otherClientEmail] } } },
        ],
      },
    });

    await prisma.studentProfile.deleteMany({
      where: { user: { email: studentEmail } },
    });

    await prisma.user.deleteMany({
      where: { email: { in: [studentEmail, clientEmail, otherClientEmail] } },
    });

    const hash = await bcrypt.hash("demo1234", 10);

    const student = await prisma.user.create({
      data: {
        name: "Test Student",
        email: studentEmail,
        passwordHash: hash,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            school: "DLSU",
            course: "BS CS",
            year: 2,
            maxHoursPerDay: 4,
          },
        },
      },
    });
    studentId = student.id;

    const client = await prisma.user.create({
      data: {
        name: "Test Client",
        email: clientEmail,
        passwordHash: hash,
        role: Role.CLIENT,
      },
    });
    clientId = client.id;

    const otherClient = await prisma.user.create({
      data: {
        name: "Other Client",
        email: otherClientEmail,
        passwordHash: hash,
        role: Role.CLIENT,
      },
    });
    otherClientId = otherClient.id;
  });

  describe("generateNewInviteCode & getStudentInviteDetails", () => {
    it("generates an 8-character code and stores it", async () => {
      const codeRecord = await generateNewInviteCode(studentId);
      expect(codeRecord.code).toHaveLength(8);
      expect(codeRecord.studentId).toBe(studentId);
      expect(codeRecord.usedByClientId).toBeNull();
    });

    it("automatically creates a code if student has none", async () => {
      const details = await getStudentInviteDetails(studentId);
      expect(details.currentCode).toBeDefined();
      expect(details.currentCode.code).toHaveLength(8);
      expect(details.linkedClient).toBeNull();
    });
  });

  describe("linkStudentToClient", () => {
    it("successfully links a student to a client and marks code used", async () => {
      const invite = await generateNewInviteCode(studentId);

      const res = await linkStudentToClient(clientId, invite.code, 180);
      expect(res.success).toBe(true);
      expect(res.data?.hourlyRate).toBe(180);
      expect(res.data?.studentName).toBe("Test Student");

      // Verify code is marked as used
      const updatedCode = await prisma.inviteCode.findUnique({
        where: { id: invite.id },
      });
      expect(updatedCode?.usedByClientId).toBe(clientId);

      // Verify link in database
      const link = await prisma.clientStudentLink.findUnique({
        where: { studentId },
      });
      expect(link).not.toBeNull();
      expect(link?.clientId).toBe(clientId);
      expect(link?.hourlyRate).toBe(180);
    });

    it("rejects invalid invite code", async () => {
      const res = await linkStudentToClient(clientId, "NONEXIST", 150);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Invalid invite code");
    });

    it("rejects already-used invite code", async () => {
      const invite = await generateNewInviteCode(studentId);

      // First link
      const first = await linkStudentToClient(clientId, invite.code, 150);
      expect(first.success).toBe(true);

      // Try using the same code with another client
      const second = await linkStudentToClient(otherClientId, invite.code, 200);
      expect(second.success).toBe(false);
      expect(second.error).toContain("already been used");
    });

    it("rejects linking a student who is already linked", async () => {
      const invite1 = await generateNewInviteCode(studentId);
      const invite2 = await generateNewInviteCode(studentId);

      // Link client 1
      await linkStudentToClient(clientId, invite1.code, 150);

      // Try linking with another code for the same student
      const res = await linkStudentToClient(otherClientId, invite2.code, 200);
      expect(res.success).toBe(false);
      expect(res.error).toContain("already linked to another client");
    });
  });

  describe("updateClientHourlyRate", () => {
    it("updates hourly rate on active link", async () => {
      const invite = await generateNewInviteCode(studentId);
      await linkStudentToClient(clientId, invite.code, 150);

      const updateRes = await updateClientHourlyRate(clientId, 220);
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.hourlyRate).toBe(220);

      const link = await prisma.clientStudentLink.findUnique({
        where: { studentId },
      });
      expect(link?.hourlyRate).toBe(220);
    });
  });

  describe("updateUserProfile", () => {
    it("updates student profile fields without changing password", async () => {
      const res = await updateUserProfile(studentId, Role.STUDENT, {
        name: "Juan Renamed",
        email: studentEmail,
        school: "Ateneo",
        course: "BS MIS",
        year: 3,
        maxHoursPerDay: 5,
      });

      expect(res.success).toBe(true);
      expect(res.data?.name).toBe("Juan Renamed");

      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: studentId },
      });
      expect(studentProfile?.school).toBe("Ateneo");
      expect(studentProfile?.maxHoursPerDay).toBe(5);
    });

    it("updates password when current password is valid", async () => {
      const res = await updateUserProfile(studentId, Role.STUDENT, {
        name: "Test Student",
        email: studentEmail,
        school: "DLSU",
        course: "BS CS",
        year: 2,
        maxHoursPerDay: 4,
        currentPassword: "demo1234",
        newPassword: "newpassword456",
        confirmPassword: "newpassword456",
      });

      expect(res.success).toBe(true);

      const user = await prisma.user.findUnique({ where: { id: studentId } });
      const validNew = await bcrypt.compare("newpassword456", user!.passwordHash);
      expect(validNew).toBe(true);
    });

    it("rejects password update when current password is wrong", async () => {
      const res = await updateUserProfile(studentId, Role.STUDENT, {
        name: "Test Student",
        email: studentEmail,
        school: "DLSU",
        course: "BS CS",
        year: 2,
        maxHoursPerDay: 4,
        currentPassword: "wrongpassword",
        newPassword: "newpassword456",
        confirmPassword: "newpassword456",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Incorrect current password");
    });
  });
});
