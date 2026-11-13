import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({
    variable: "--font-bricolage",
    className: "font-display",
  }),
}));

import { renderToString } from "react-dom/server";
import { LoginForm, getSafeCallbackUrl } from "./login-form";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/actions/auth", () => ({
  loginAction: vi.fn(),
}));

describe("LoginForm Polish & Security Pass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe("Open Redirect Protection (getSafeCallbackUrl)", () => {
    it("accepts valid relative path starting with a single forward slash", () => {
      expect(getSafeCallbackUrl("/student/tasks")).toBe("/student/tasks");
      expect(getSafeCallbackUrl("/client")).toBe("/client");
      expect(getSafeCallbackUrl("/student/schedule?tab=week")).toBe("/student/schedule?tab=week");
    });

    it("rejects absolute URLs with protocol schemes", () => {
      expect(getSafeCallbackUrl("https://evil.com")).toBeNull();
      expect(getSafeCallbackUrl("http://evil.com/path")).toBeNull();
      expect(getSafeCallbackUrl("javascript:alert(1)")).toBeNull();
      expect(getSafeCallbackUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBeNull();
    });

    it("rejects protocol-relative URLs starting with //", () => {
      expect(getSafeCallbackUrl("//evil.com")).toBeNull();
      expect(getSafeCallbackUrl("//evil.com/path")).toBeNull();
      expect(getSafeCallbackUrl("///triple-slash")).toBeNull();
    });

    it("rejects Windows backslash traversal attempts (/\\)", () => {
      expect(getSafeCallbackUrl("/\\evil.com")).toBeNull();
      expect(getSafeCallbackUrl("/\\evil.com/phish")).toBeNull();
    });

    it("rejects URLs containing :// anywhere", () => {
      expect(getSafeCallbackUrl("/redirect?target=https://evil.com")).toBeNull();
    });

    it("rejects null, undefined, empty, or whitespace strings", () => {
      expect(getSafeCallbackUrl(null)).toBeNull();
      expect(getSafeCallbackUrl(undefined)).toBeNull();
      expect(getSafeCallbackUrl("")).toBeNull();
      expect(getSafeCallbackUrl("   ")).toBeNull();
    });
  });

  describe("Form Rendering & Accessibility", () => {
    it("renders title 'Log in to your account' and subtitle 'Enter your email and password below.'", () => {
      const html = renderToString(<LoginForm />);
      expect(html).toContain("Log in to your account");
      expect(html).toContain("Enter your email and password below.");
    });

    it("renders submit button with label 'Log in' and data-testid 'login-submit'", () => {
      const html = renderToString(<LoginForm />);
      expect(html).toContain('data-testid="login-submit"');
      expect(html).toContain("Log in");
      expect(html).not.toContain("<span>Sign in</span>");
    });

    it("renders 'New here? Create an account' linking to /register", () => {
      const html = renderToString(<LoginForm />);
      expect(html).toContain("New here?");
      expect(html).toContain("Create an account");
      expect(html).toContain('href="/register"');
    });

    it("renders email field with autocomplete='username' and data-testid 'login-email'", () => {
      const html = renderToString(<LoginForm />);
      expect(html).toContain('data-testid="login-email"');
      expect(html).toContain('type="email"');
      expect(html).toContain('autoComplete="username"');
      expect(html).toContain('placeholder="name@example.com"');
    });

    it("renders password field starting empty with 'Your password' placeholder (never dots)", () => {
      const html = renderToString(<LoginForm />);
      expect(html).toContain('data-testid="login-password"');
      expect(html).toContain('type="password"');
      expect(html).toContain('placeholder="Your password"');
      expect(html).not.toContain('placeholder="••••••••"');
      // Starts empty
      expect(html).toContain('value=""');
    });

    it("renders password toggle button with data-testid 'login-password-toggle'", () => {
      const html = renderToString(<LoginForm />);
      expect(html).toContain('data-testid="login-password-toggle"');
      expect(html).toContain('aria-label="Show password"');
    });

    it("renders 'Forgot password?' link with data-testid 'login-forgot-link'", () => {
      const html = renderToString(<LoginForm />);
      expect(html).toContain('data-testid="login-forgot-link"');
      expect(html).toContain('href="/forgot-password"');
      expect(html).toContain("Forgot password?");
    });
  });

  describe("Error and Success Banners", () => {
    it("renders unified error message 'Email or password is incorrect.' when errorParam is CredentialsSignin", () => {
      mockSearchParams = new URLSearchParams("error=CredentialsSignin");
      const html = renderToString(<LoginForm />);
      expect(html).toContain('data-testid="login-error"');
      expect(html).toContain("Email or password is incorrect.");
      expect(html).not.toContain("Invalid email or password. Please try again.");
    });

    it("renders registration success banner when registered=1 is in query parameters", () => {
      mockSearchParams = new URLSearchParams("registered=1&email=test%40example.com");
      const html = renderToString(<LoginForm />);
      expect(html).toContain('role="status"');
      expect(html).toContain("Account created successfully. Please enter your password to log in.");
      expect(html).toContain('value="test@example.com"');
    });
  });
});
