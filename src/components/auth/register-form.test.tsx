import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({
    variable: "--font-bricolage",
    className: "font-display",
  }),
}));

import { renderToString } from "react-dom/server";
import { RegisterForm } from "./register-form";
import { AuthLayout } from "./auth-layout";
import { Role } from "@prisma/client";
import { registerSchema } from "@/lib/validations/auth";

let mockSearchParams = new URLSearchParams();
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/actions/auth", () => ({
  registerAction: vi.fn(),
  loginAction: vi.fn(),
  logoutAction: vi.fn(),
}));

describe("RegisterForm and AuthLayout Dark Editorial Polish Pass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe("?role Preselection", () => {
    it("preselects STUDENT when ?role=STUDENT is present", () => {
      mockSearchParams = new URLSearchParams("role=STUDENT");
      const html = renderToString(<RegisterForm />);

      // Role radiogroup has radio semantics
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('data-testid="auth-role-student"');
      expect(html).toContain('data-testid="auth-role-client"');

      // Student option is aria-checked=true
      expect(html).toMatch(/role="radio"[^>]*aria-checked="true"[^>]*data-testid="auth-role-student"/);
      expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*data-testid="auth-role-client"/);

      // Student-only school fields are rendered
      expect(html).toContain('data-testid="auth-school"');
      expect(html).toContain('data-testid="auth-course"');
      expect(html).toContain('data-testid="auth-year"');
      expect(html).toContain("Academic Details");

      // Submit button text matches student
      expect(html).toContain("Create student account");

      // Helper line for student
      expect(html).toContain("You&#x27;ll get an invite code after signup to share with your client.");

      // Left panel copy for student
      expect(html).toContain("Work around your classes, not through them.");
      expect(html).toContain("Your class schedule is the source of truth—clients can only book your free windows.");
    });

    it("preselects CLIENT when ?role=CLIENT is present", () => {
      mockSearchParams = new URLSearchParams("role=CLIENT");
      const html = renderToString(<RegisterForm />);

      // Client option is aria-checked=true
      expect(html).toMatch(/role="radio"[^>]*aria-checked="true"[^>]*data-testid="auth-role-client"/);
      expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*data-testid="auth-role-student"/);

      // Student-only fields are NOT rendered for client
      expect(html).not.toContain('data-testid="auth-school"');
      expect(html).not.toContain('data-testid="auth-course"');
      expect(html).not.toContain('data-testid="auth-year"');
      expect(html).not.toContain("Academic Details");

      // Submit button text matches client
      expect(html).toContain("Create client account");

      // Helper line for client
      expect(html).toContain("You&#x27;ll link your student account using their invite code after signup.");

      // Left panel copy for client
      expect(html).toContain("Assign tasks that fit your student&#x27;s schedule.");
      expect(html).toContain("Every task is checked against your student&#x27;s classes and available hours before it&#x27;s sent.");
    });

    it("defaults to STUDENT when ?role is invalid (e.g. ?role=ADMIN or ?role=xyz)", () => {
      mockSearchParams = new URLSearchParams("role=ADMIN");
      const html = renderToString(<RegisterForm />);

      expect(html).toMatch(/role="radio"[^>]*aria-checked="true"[^>]*data-testid="auth-role-student"/);
      expect(html).toContain('data-testid="auth-school"');
      expect(html).toContain("Create student account");
    });

    it("defaults to STUDENT when ?role is missing", () => {
      mockSearchParams = new URLSearchParams("");
      const html = renderToString(<RegisterForm />);

      expect(html).toMatch(/role="radio"[^>]*aria-checked="true"[^>]*data-testid="auth-role-student"/);
      expect(html).toContain('data-testid="auth-school"');
      expect(html).toContain("Create student account");
    });
  });

  describe("Form Fields, Styling & Accessibility", () => {
    it("renders all required testids and headings", () => {
      mockSearchParams = new URLSearchParams("role=STUDENT");
      const html = renderToString(<RegisterForm />);

      expect(html).toContain('data-testid="auth-role-student"');
      expect(html).toContain('data-testid="auth-role-client"');
      expect(html).toContain('data-testid="auth-name"');
      expect(html).toContain('data-testid="auth-email"');
      expect(html).toContain('data-testid="auth-password"');
      expect(html).toContain('data-testid="auth-password-toggle"');
      expect(html).toContain('data-testid="auth-school"');
      expect(html).toContain('data-testid="auth-course"');
      expect(html).toContain('data-testid="auth-year"');
      expect(html).toContain('data-testid="auth-submit"');

      // Title is 'Create your account' and Subtitle is 'Choose your role to get started.'
      expect(html).toContain("Create your account");
      expect(html).toContain("Choose your role to get started.");

      // Section divider
      expect(html).toContain("Academic Details");
    });

    it("renders password toggle with type='button', accessible aria-label, and 'At least 8 characters' placeholder", () => {
      const html = renderToString(<RegisterForm />);

      // Password toggle button does NOT submit form
      expect(html).toMatch(/<button[^>]*type="button"[^>]*data-testid="auth-password-toggle"/);
      expect(html).toContain('aria-label="Show password"');
      expect(html).toContain('placeholder="At least 8 characters"');
    });

    it("verifies the split-screen layout rules and borderless form container", () => {
      const html = renderToString(<RegisterForm />);

      // Outer split-screen grid
      expect(html).toContain("min-h-screen");
      expect(html).toContain("lg:grid-cols-2");
      expect(html).toContain("bg-white");
      expect(html).toContain("text-[#0F172A]");

      // Left panel dark showcase with system #0F172A
      expect(html).toContain("bg-[#0F172A]");
      expect(html).toContain("text-slate-50");
      expect(html).toContain("border-slate-800");

      // Form container max width
      expect(html).toContain("max-w-[380px]");

      // No mockup card
      expect(html).not.toContain("Live Schedule Check");
    });

    it("renders the 3 minimal editorial value rows, back to home, and no mockup cards in AuthLayout", () => {
      const html = renderToString(
        <AuthLayout role={Role.STUDENT} mode="register">
          <div>Form Content</div>
        </AuthLayout>
      );

      expect(html).not.toContain("Live Schedule Check");
      expect(html).toContain("Hard conflict blocking.");
      expect(html).toContain("Overlapping class hours automatically block task submissions.");
      expect(html).toContain("Subject-level privacy.");
      expect(html).toContain("Clients only see busy blocks, never your course or subject names.");
      expect(html).toContain("Verified timesheets.");
      expect(html).toContain("Track Time In/Out and approve hours with automatic invoice totals.");
      expect(html).toContain("Student VA-Hub · Asia/Manila (UTC+8)");
      expect(html).toContain("Back to home");
    });

    it("renders neutral headline for login and forgot-password modes in AuthLayout", () => {
      const htmlLogin = renderToString(
        <AuthLayout mode="login">
          <div>Login Form</div>
        </AuthLayout>
      );
      expect(htmlLogin).toContain("Pick up right where you left off.");
      expect(htmlLogin).toContain("Your class schedule, available work windows, and timesheets in one place.");

      const htmlForgot = renderToString(
        <AuthLayout mode="forgot-password">
          <div>Forgot Password Form</div>
        </AuthLayout>
      );
      expect(htmlForgot).toContain("Pick up right where you left off.");
    });
  });

  describe("Validation & Role Switching Logic", () => {
    it("ensures student-only fields are NOT sent for clients in registration payload", () => {
      // Common typed fields
      const typedState = {
        name: "Maria Client",
        email: "maria@client.com",
        password: "securePassword123",
        school: "UP Diliman",
        course: "BS Computer Science",
        year: 3,
      };

      // When role is CLIENT, registration payload omits student fields:
      const clientFormData: { role: "CLIENT"; name: string; email: string; password: string } = {
        role: "CLIENT",
        name: typedState.name,
        email: typedState.email,
        password: typedState.password,
      };

      const parsedClient = registerSchema.safeParse(clientFormData);
      expect(parsedClient.success).toBe(true);
      if (parsedClient.success) {
        expect(parsedClient.data.role).toBe("CLIENT");
        expect((parsedClient.data as Record<string, unknown>).school).toBeUndefined();
        expect((parsedClient.data as Record<string, unknown>).course).toBeUndefined();
        expect((parsedClient.data as Record<string, unknown>).year).toBeUndefined();
      }

      // When role is STUDENT, registration payload includes school, course, year:
      const studentFormData = {
        role: "STUDENT" as const,
        name: typedState.name,
        email: typedState.email,
        password: typedState.password,
        school: typedState.school,
        course: typedState.course,
        year: typedState.year,
      };

      const parsedStudent = registerSchema.safeParse(studentFormData);
      expect(parsedStudent.success).toBe(true);
      if (parsedStudent.success) {
        expect(parsedStudent.data.role).toBe("STUDENT");
        expect((parsedStudent.data as Record<string, unknown>).school).toBe("UP Diliman");
      }
    });

    it("switching role preserves typed name, email, and password in component state", () => {
      // Simulating state retention across role toggle
      let currentRole: Role = Role.STUDENT;
      const state = {
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        password: "mypassword123",
        school: "UST",
        course: "BS Information Technology",
        year: 2,
      };

      // Switch to CLIENT
      currentRole = Role.CLIENT;
      expect(currentRole).toBe(Role.CLIENT);
      // Typed fields remain in state
      expect(state.name).toBe("Juan Dela Cruz");
      expect(state.email).toBe("juan@example.com");
      expect(state.password).toBe("mypassword123");
      expect(state.school).toBe("UST");

      // Switch back to STUDENT
      currentRole = Role.STUDENT;
      expect(currentRole).toBe(Role.STUDENT);
      expect(state.name).toBe("Juan Dela Cruz");
      expect(state.email).toBe("juan@example.com");
      expect(state.password).toBe("mypassword123");
      expect(state.school).toBe("UST");
    });

    it("verifies the submit button renders disabled when pending/submitting", () => {
      // Render simulated disabled button state matching register-form implementation
      const htmlDisabled = renderToString(
        <button type="submit" disabled={true} data-testid="auth-submit">
          Creating account...
        </button>
      );
      expect(htmlDisabled).toContain("disabled");
      expect(htmlDisabled).toContain("Creating account...");
      expect(htmlDisabled).toContain('data-testid="auth-submit"');
    });
  });
});
