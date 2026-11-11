import { describe, it, expect } from "vitest";
import {
  approveTimeLogSchema,
  disputeTimeLogSchema,
  respondCorrectionSchema,
  markInvoicePaidSchema,
} from "./invoice";

describe("invoice validation schemas", () => {
  describe("approveTimeLogSchema", () => {
    it("accepts valid timeLogId", () => {
      expect(approveTimeLogSchema.safeParse({ timeLogId: "tl-1" }).success).toBe(true);
    });

    it("rejects empty timeLogId", () => {
      expect(approveTimeLogSchema.safeParse({ timeLogId: "" }).success).toBe(false);
    });
  });

  describe("disputeTimeLogSchema", () => {
    it("accepts valid dispute reason", () => {
      expect(
        disputeTimeLogSchema.safeParse({
          timeLogId: "tl-1",
          disputeReason: "Work completed earlier than recorded time out.",
        }).success
      ).toBe(true);
    });

    it("rejects short dispute reason", () => {
      expect(
        disputeTimeLogSchema.safeParse({
          timeLogId: "tl-1",
          disputeReason: "no",
        }).success
      ).toBe(false);
    });
  });

  describe("respondCorrectionSchema", () => {
    it("accepts APPROVE and REJECT", () => {
      expect(
        respondCorrectionSchema.safeParse({ timeLogId: "tl-1", decision: "APPROVE" }).success
      ).toBe(true);
      expect(
        respondCorrectionSchema.safeParse({ timeLogId: "tl-1", decision: "REJECT" }).success
      ).toBe(true);
    });

    it("rejects invalid decisions", () => {
      expect(
        respondCorrectionSchema.safeParse({ timeLogId: "tl-1", decision: "MAYBE" }).success
      ).toBe(false);
    });
  });

  describe("markInvoicePaidSchema", () => {
    it("accepts valid invoiceId", () => {
      expect(markInvoicePaidSchema.safeParse({ invoiceId: "inv-1" }).success).toBe(true);
    });
  });
});
