import { describe, it, expect } from "vitest";
import { z } from "zod";
import { toUserErrorMessage, formatZodFieldErrors, DEFAULT_ERROR_MESSAGE } from "./errors";

describe("Central Error Layer (errors.ts)", () => {
  it("converts Zod errors into friendly first-issue message", () => {
    const schema = z.object({
      email: z.string().email("Please provide a valid email address."),
    });
    const parsed = schema.safeParse({ email: "invalid" });
    if (!parsed.success) {
      expect(toUserErrorMessage(parsed.error)).toBe("Please provide a valid email address.");
      const fields = formatZodFieldErrors(parsed.error);
      expect(fields.email).toBe("Please provide a valid email address.");
    }
  });

  it("converts Prisma P2002 error to friendly message", () => {
    const prismaError = { code: "P2002", message: "Unique constraint failed" };
    expect(toUserErrorMessage(prismaError)).toBe("This record already exists. Please use a different value.");
  });

  it("converts Prisma P2025 error to friendly message", () => {
    const prismaError = { code: "P2025", message: "Record to update not found." };
    expect(toUserErrorMessage(prismaError)).toBe("The requested record was not found.");
  });

  it("converts raw auth and 401 errors into friendly message", () => {
    expect(toUserErrorMessage(new Error("Unauthorized: Please log in"))).toBe("Please log in to continue.");
    expect(toUserErrorMessage("HTTP 401 Unauthorized")).toBe("Please log in to continue.");
  });

  it("converts 403 / Forbidden errors into friendly message", () => {
    expect(toUserErrorMessage(new Error("Forbidden: This resource requires the STUDENT role"))).toBe(
      "You do not have permission to perform this action."
    );
  });

  it("hides technical SQL/Prisma internal stack traces", () => {
    const technicalErr = new Error("Invalid `prisma.user.findUnique()` failed. SELECT * FROM users");
    expect(toUserErrorMessage(technicalErr)).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it("handles null and undefined gracefully", () => {
    expect(toUserErrorMessage(null)).toBe(DEFAULT_ERROR_MESSAGE);
    expect(toUserErrorMessage(undefined)).toBe(DEFAULT_ERROR_MESSAGE);
  });
});

