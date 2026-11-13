import { describe, it, expect, vi } from "vitest";
import ForgotPasswordPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("ForgotPasswordPage", () => {
  it("redirects to /login", async () => {
    const { redirect } = await import("next/navigation");
    ForgotPasswordPage();
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});

