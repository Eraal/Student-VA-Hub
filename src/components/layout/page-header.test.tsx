import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { PageHeader } from "./page-header";
import { PageContainer } from "./page-container";
import { Button } from "@/components/ui/button";

describe("PageHeader Component", () => {
  it("renders the title inside an h1 with display font and ink color token", () => {
    const html = renderToString(<PageHeader title="Tasks Overview" />);

    expect(html).toContain("<h1");
    expect(html).toContain("Tasks Overview");
    expect(html).toContain("font-display");
    expect(html).toContain("text-2xl sm:text-3xl");
    expect(html).toContain("font-extrabold");
    expect(html).toContain("tracking-tight");
    expect(html).toContain("text-[var(--color-text)]");
  });

  it("renders subtitle with 14px muted styling", () => {
    const html = renderToString(
      <PageHeader
        title="Timesheets"
        subtitle="Review hours submitted by your student."
      />
    );

    expect(html).toContain("Review hours submitted by your student.");
    expect(html).toContain("text-sm text-[var(--color-muted-darker)]");
  });

  it("renders badge adjacent to title", () => {
    const html = renderToString(
      <PageHeader
        title="Notifications"
        badge={<span data-testid="test-badge">3 unread</span>}
      />
    );

    expect(html).toContain('data-testid="test-badge"');
    expect(html).toContain("3 unread");
  });

  it("renders actions container with responsive wrapping classes", () => {
    const html = renderToString(
      <PageHeader
        title="Schedule"
        actions={<Button>Add class</Button>}
      />
    );

    expect(html).toContain("Add class");
    expect(html).toContain("sm:justify-end");
    expect(html).toContain("w-full sm:w-auto");
  });

  it("renders visually hidden h1 when srOnlyTitle is true", () => {
    const html = renderToString(<PageHeader title="Profile" srOnlyTitle />);

    expect(html).toContain("<header");
    expect(html).toContain("sr-only");
    expect(html).toContain("<h1>Profile</h1>");
  });

  it("includes 24px bottom spacing (mb-6)", () => {
    const html = renderToString(<PageHeader title="Earnings" />);

    expect(html).toContain("mb-6");
  });
});

describe("PageContainer Component", () => {
  it("renders a full-width container with space-y-6 and data-testid", () => {
    const html = renderToString(
      <PageContainer>
        <div>Content item</div>
      </PageContainer>
    );

    expect(html).toContain('data-testid="page-container"');
    expect(html).toContain("w-full space-y-6");
    expect(html).toContain("Content item");
    // Ensure no per-page max-w override is forced
    expect(html).not.toContain("max-w-5xl");
    expect(html).not.toContain("max-w-4xl");
  });
});
