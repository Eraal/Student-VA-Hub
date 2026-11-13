import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { LiveUpdates, isDialogWithUnsavedInputOpen } from "./live-updates";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/actions/notification", () => ({
  getLatestNotificationAction: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("isDialogWithUnsavedInputOpen", () => {
  it("returns false safely when document is undefined (SSR / Node)", () => {
    expect(isDialogWithUnsavedInputOpen()).toBe(false);
  });

  it("detects unsaved input in open dialog when DOM is present", () => {
    const mockInput = {
      value: "User typed note",
      defaultValue: "",
    };

    const mockDialog = {
      getAttribute: (attr: string) => (attr === "aria-hidden" ? "false" : null),
      querySelectorAll: () => [mockInput],
    };

    const originalDoc = globalThis.document;
    const originalWin = globalThis.window;

    try {
      (globalThis as any).window = {
        getComputedStyle: () => ({ display: "block", visibility: "visible" }),
      };
      (globalThis as any).document = {
        querySelectorAll: () => [mockDialog],
        activeElement: null,
      };

      expect(isDialogWithUnsavedInputOpen()).toBe(true);

      // When input has not been modified
      mockInput.value = "";
      expect(isDialogWithUnsavedInputOpen()).toBe(false);
    } finally {
      globalThis.document = originalDoc;
      globalThis.window = originalWin;
    }
  });

  it("ignores hidden dialogs via aria-hidden", () => {
    const mockDialog = {
      getAttribute: (attr: string) => (attr === "aria-hidden" ? "true" : null),
      querySelectorAll: () => [{ value: "text", defaultValue: "" }],
    };

    const originalDoc = globalThis.document;
    const originalWin = globalThis.window;

    try {
      (globalThis as any).window = {
        getComputedStyle: () => ({ display: "block", visibility: "visible" }),
      };
      (globalThis as any).document = {
        querySelectorAll: () => [mockDialog],
        activeElement: null,
      };

      expect(isDialogWithUnsavedInputOpen()).toBe(false);
    } finally {
      globalThis.document = originalDoc;
      globalThis.window = originalWin;
    }
  });
});

describe("LiveUpdates Component", () => {
  it("renders null without throwing error", () => {
    const html = renderToString(React.createElement(LiveUpdates));
    expect(html).toBe("");
  });
});
