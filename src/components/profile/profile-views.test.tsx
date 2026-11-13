import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { Role } from "@prisma/client";
import { StudentProfileView } from "@/components/student/student-profile-view";
import { ClientProfileView } from "@/components/client/client-profile-view";
import { serializeClientProfileLink } from "@/lib/services/invite-service";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/actions/profile", () => ({
  updateStudentProfileAction: vi.fn(),
  updateClientProfileAction: vi.fn(),
}));

vi.mock("@/lib/actions/invite-code", () => ({
  generateStudentInviteCodeAction: vi.fn(),
}));

vi.mock("@/lib/actions/client-link", () => ({
  linkStudentAction: vi.fn(),
  updateHourlyRateAction: vi.fn(),
}));

vi.mock("@/lib/actions/auth", () => ({
  logoutAction: vi.fn(),
}));

describe("Student and Client Profile Polish Pass", () => {
  const sampleStudentUser = {
    id: "student-1",
    name: "Juan dela Cruz",
    email: "juan@up.edu.ph",
    role: Role.STUDENT,
  };

  const sampleStudentProfile = {
    school: "UP Diliman",
    course: "BSCS",
    year: 3,
    maxHoursPerDay: 4,
  };

  const sampleActiveInviteDetails = {
    currentCode: {
      id: "code-1",
      code: "QDFCYKAP",
      usedByClientId: "client-1",
      createdAt: new Date("2026-11-01T08:00:00Z"),
    },
    linkedClient: {
      id: "client-1",
      name: "Acme Corp",
      email: "client@acme.com",
    },
    link: {
      id: "link-1",
      hourlyRate: 150,
      status: "ACTIVE",
      createdAt: new Date("2026-11-02T10:00:00Z"),
    },
  };

  const sampleUnusedInviteDetails = {
    currentCode: {
      id: "code-2",
      code: "QDFCYKAP",
      usedByClientId: null,
      createdAt: new Date("2026-11-10T08:00:00Z"),
    },
    linkedClient: null,
    link: null,
  };

  const sampleNoCodeInviteDetails = {
    currentCode: null,
    linkedClient: null,
    link: null,
  };

  const sampleClientUser = {
    id: "client-1",
    name: "Maria Clara",
    email: "maria@clara.ph",
    role: Role.CLIENT,
  };

  const sampleClientLink = {
    id: "link-1",
    hourlyRate: 200,
    status: "ACTIVE",
    createdAt: new Date("2026-11-05T08:00:00Z"),
    student: {
      id: "student-1",
      name: "Juan dela Cruz",
      email: "juan@up.edu.ph",
    },
  };

  describe("Privacy & Serialization", () => {
    it("ensures the serialized client profile data contains no school, course, yearLevel or any class information", () => {
      const rawDataWithSensitiveFields = {
        id: "link-1",
        hourlyRate: 200,
        status: "ACTIVE",
        createdAt: new Date("2026-11-05T08:00:00Z"),
        student: {
          id: "student-1",
          name: "Juan dela Cruz",
          email: "juan@up.edu.ph",
          school: "UP Diliman",
          course: "BS Computer Science",
          year: 3,
          yearLevel: 3,
          classes: [{ subject: "CS 312", room: "Engg 204" }],
          studentProfile: {
            school: "UP Diliman",
            course: "BS Computer Science",
            year: 3,
            maxHoursPerDay: 4,
          },
        },
      };

      const serialized = serializeClientProfileLink(rawDataWithSensitiveFields);
      expect(serialized).not.toBeNull();

      const json = JSON.stringify(serialized);
      expect(json).not.toContain("UP Diliman");
      expect(json).not.toContain("BS Computer Science");
      expect(json).not.toContain("CS 312");
      expect(json).not.toContain("school");
      expect(json).not.toContain("course");
      expect(json).not.toContain("yearLevel");
      expect(json).not.toContain("year");
      expect(json).not.toContain("classes");
      expect(json).not.toContain("studentProfile");

      // Contains ONLY permitted fields: name, email, hourly rate, link status, link createdAt
      expect(Object.keys(serialized!)).toEqual([
        "id",
        "hourlyRate",
        "status",
        "createdAt",
        "student",
      ]);
      expect(Object.keys(serialized!.student)).toEqual(["id", "name", "email"]);
    });
  });

  describe("StudentProfileView", () => {
    it("renders compact header card with avatar initials, role badge, muted email, and neutral logout button", () => {
      const html = renderToString(
        <StudentProfileView
          initialUser={sampleStudentUser}
          initialProfile={sampleStudentProfile}
          inviteDetails={sampleActiveInviteDetails}
        />
      );

      expect(html).toContain('data-testid="profile-header"');
      expect(html).toContain("Juan dela Cruz");
      expect(html).toContain("JC"); // avatar initials
      expect(html).toContain("Student VA");
      expect(html).toContain("juan@up.edu.ph");
      expect(html).toContain('data-testid="profile-logout-header"');
      expect(html).not.toContain("border-[#DC2626]"); // not red
    });

    it("renders personal details form with read-only daily limit row and schedule link", () => {
      const html = renderToString(
        <StudentProfileView
          initialUser={sampleStudentUser}
          initialProfile={sampleStudentProfile}
          inviteDetails={sampleActiveInviteDetails}
        />
      );

      expect(html).toContain('data-testid="profile-form"');
      expect(html).toContain('data-testid="profile-save"');
      expect(html).toContain('data-testid="daily-limit-readonly"');
      expect(html).toContain("Daily hour limit: 4h");
      expect(html).toContain("Change in Schedule");
      expect(html).toContain('href="/student/schedule#availability"');
      expect(html).toContain('name="school"');
      expect(html).toContain('name="course"');
      expect(html).toContain('name="email"');
    });

    it("renders password card and mobile logout button", () => {
      const html = renderToString(
        <StudentProfileView
          initialUser={sampleStudentUser}
          initialProfile={sampleStudentProfile}
          inviteDetails={sampleActiveInviteDetails}
        />
      );

      expect(html).toContain("Change password");
      expect(html).toContain('data-testid="password-form"');
      expect(html).toContain('data-testid="password-submit"');
      expect(html).toContain("Current password");
      expect(html).toContain("New password");
      expect(html).toContain("Confirm new password");
      expect(html).toContain('data-testid="logout-button"');
      expect(html).toContain("Log out");
    });

    it("renders linked client card with rate pill and date, and calm line for used invite code", () => {
      const html = renderToString(
        <StudentProfileView
          initialUser={sampleStudentUser}
          initialProfile={sampleStudentProfile}
          inviteDetails={sampleActiveInviteDetails}
        />
      );

      expect(html).toContain('data-testid="linked-card"');
      expect(html).toContain("Acme Corp");
      expect(html).toContain("client@acme.com");
      expect(html).toContain("₱150.00/hr");
      expect(html).toContain("Linked since");

      // Active link: calm line, hides code and generate button
      expect(html).toContain("Your invite code was used. You&#x27;re linked with");
      expect(html).not.toContain("Generate new code");
      expect(html).not.toContain('data-testid="invite-code-value"');
      expect(html).not.toContain("Previous Code (Used)");
      expect(html).not.toContain("another client");
      expect(html).not.toContain("Conflict Detector");
    });

    it("renders unlinked state with empty notice, large grouped invite code, and copy button", () => {
      const html = renderToString(
        <StudentProfileView
          initialUser={sampleStudentUser}
          initialProfile={sampleStudentProfile}
          inviteDetails={sampleUnusedInviteDetails}
        />
      );

      expect(html).toContain("No client linked yet. Share your invite code and your client will appear here.");
      expect(html).toContain('data-testid="invite-code-value"');
      expect(html).toContain("QDFC YKAP"); // 2 groups of 4 in monospace
      expect(html).toContain('data-testid="invite-code-copy"');
      expect(html).toContain("Copy code");
      expect(html).toContain("Your client enters this code to link with you.");
      expect(html).not.toContain("another client");
    });

    it("renders generate invite code button when no code exists", () => {
      const html = renderToString(
        <StudentProfileView
          initialUser={sampleStudentUser}
          initialProfile={sampleStudentProfile}
          inviteDetails={sampleNoCodeInviteDetails}
        />
      );

      expect(html).toContain('data-testid="invite-code-generate"');
      expect(html).toContain("Generate invite code");
    });
  });

  describe("ClientProfileView", () => {
    it("renders unlinked client with compact header and link student form with ₱ prefix and uppercase code", () => {
      const html = renderToString(
        <ClientProfileView
          initialUser={sampleClientUser}
          initialLink={null}
        />
      );

      expect(html).toContain('data-testid="profile-header"');
      expect(html).toContain("Maria Clara");
      expect(html).toContain("MC");
      expect(html).toContain("Client");
      expect(html).toContain("maria@clara.ph");
      expect(html).not.toContain("No student linked yet"); // removed from header
      expect(html).not.toContain("Linked with");

      expect(html).toContain('data-testid="profile-logout-header"');
      expect(html).toContain('data-testid="profile-form"');
      expect(html).toContain('data-testid="profile-save"');
      expect(html).toContain('data-testid="password-form"');
      expect(html).toContain('data-testid="password-submit"');
      expect(html).toContain('data-testid="logout-button"');

      // Link student form
      expect(html).toContain('data-testid="link-student-code"');
      expect(html).toContain('data-testid="link-student-rate"');
      expect(html).toContain('data-testid="link-student-submit"');
      expect(html).toContain("Link student");
    });

    it("renders linked client with student details card, rate pill, and edit rate button, with NO academic info", () => {
      const html = renderToString(
        <ClientProfileView
          initialUser={sampleClientUser}
          initialLink={sampleClientLink}
        />
      );

      expect(html).toContain('data-testid="profile-header"');
      expect(html).not.toContain("Linked with Juan dela Cruz"); // removed from header

      expect(html).toContain('data-testid="linked-card"');
      expect(html).toContain("Juan dela Cruz");
      expect(html).toContain("juan@up.edu.ph");
      expect(html).toContain("₱200.00/hr");
      expect(html).toContain('data-testid="edit-rate-open"');
      expect(html).toContain("Edit rate");

      // PRIVACY: Never shows academic fields or schedule
      expect(html).not.toContain("School");
      expect(html).not.toContain("Course");
      expect(html).not.toContain("Year level");
      expect(html).not.toContain("UP Diliman");
      expect(html).not.toContain("BSCS");
      expect(html).not.toContain("3rd year");
      expect(html).not.toContain("Class Schedule");
      expect(html).not.toContain("Timetable");
    });
  });
});
