import { describe, it, expect, vi } from "vitest";
import * as React from "react";

vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({
    variable: "--font-bricolage",
    className: "font-display",
  }),
}));

import { renderToString } from "react-dom/server";
import { FAQSection } from "./faq";
import { HowItWorks } from "./how-it-works";
import { InteractiveDemo } from "./interactive-demo";
import { HeroSection } from "./hero";
import { AudienceComparison } from "./audience-comparison";
import { BentoBenefits } from "./bento-benefits";
import { CTAFooter } from "./cta-footer";
import { LandingNavbar } from "./navbar";

describe("Landing Page Polish Pass", () => {
  describe("FAQ Section", () => {
    it("renders chevron in both open and closed states, with correct ARIA attributes and answers", () => {
      const html = renderToString(<FAQSection />);
      // Initially, faq-privacy is open
      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain('aria-controls="content-faq-privacy"');
      expect(html).toContain('id="content-faq-privacy"');
      expect(html).toContain("Can clients see my subjects?");
      expect(html).toContain("No. Clients only see an &#x27;In class&#x27; block with the time. Subject names are never shown to them.");
      expect(html).toContain("Does Student VA-Hub handle payments?");
      expect(html).toContain("How do students and clients connect?");
      expect(html).toContain("Is there a daily limit?");
      // Eyebrow has no icon
      expect(html).toContain("<span>FAQ</span>");
      expect(html).not.toContain("HelpCircle");
    });
  });

  describe("How It Works Section", () => {
    it("renders 3 steps with updated headings, grid items-stretch, no monospace and no truncation", () => {
      const html = renderToString(<HowItWorks />);
      expect(html).toContain("Three steps from class schedule to assigned task.");
      expect(html).toContain("Work is planned around class time, so clashes are caught before a task is sent.");
      // Check grid items-stretch
      expect(html).toContain("items-stretch");
      // Check no monospace in step numbers or boxes
      expect(html).not.toContain("font-mono");
      // Check 'Visual check' label was removed
      expect(html).not.toContain("Visual check");
      // Check example snippets exist and are not truncated
      expect(html).toContain("10:00 AM – 12:00 PM: Class block");
      expect(html).toContain("Task: Social media lead gen (2h)");
      expect(html).toContain("Conflict: Juan has class 1:00 PM – 2:30 PM");
      expect(html).toContain("break-words");
    });
  });

  describe("Interactive Demo", () => {
    it("renders Outside free hours on 8:00–10:00 AM and single In class without extra Class chip", () => {
      const html = renderToString(<InteractiveDemo />);
      // mon-1 row
      expect(html).toContain("Outside free hours");
      // Free window row
      expect(html).toContain("Free window");
      // Class row should show "In class" once with lock icon and NOT have extra "Class" chip
      expect(html).toContain("In class");
      // Make sure there is no standalone badge with "Class" chip
      expect(html).not.toContain('<span class="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-800">Class</span>');
      // Initial demo result is conflict with Juan
      expect(html).toContain("Conflict! Juan has class 1:00 PM – 2:30 PM");
      expect(html).toContain("This task can&#x27;t be submitted");
      expect(html).toContain("Subject names are never shown to clients.");
    });
  });

  describe("Hero Section", () => {
    it("renders updated copy, ink underline, no pulse icon on eyebrow, and correct button links", () => {
      const html = renderToString(<HeroSection />);
      expect(html).toContain(
        "Student VA-Hub checks every task against the student&#x27;s class schedule before it&#x27;s sent, so work is planned around class time. Fewer clashes, clearer limits, no last-minute surprises."
      );
      // Hero headline SVG underline is ink (text-[#0F172A])
      expect(html).toContain("text-[#0F172A] z-0 overflow-visible");
      // Eyebrow tagline without pulsing icon
      expect(html).toContain("<span>Built for working students and their clients</span>");
      expect(html).not.toContain("animate-pulse");
      // Register links
      expect(html).toContain('href="/register?role=STUDENT"');
      expect(html).toContain('href="/register?role=CLIENT"');
    });
  });

  describe("Audience Comparison Section", () => {
    it("renders updated headings, client bullet, ink eyebrows and check icons", () => {
      const html = renderToString(<AudienceComparison />);
      expect(html).toContain("Plan work around your classes");
      expect(html).toContain("Assign work that fits their schedule");
      expect(html).toContain("Checked before it&#x27;s sent");
      expect(html).toContain(
        "Tasks are checked against the student&#x27;s classes and free time before they reach them."
      );
      // Ink eyebrows
      expect(html).toContain("text-slate-700");
      expect(html).not.toContain("text-blue-600");
      expect(html).not.toContain("text-green-700");
    });
  });

  describe("Bento Benefits Section", () => {
    it("renders benefits without font-mono and with tabular-nums", () => {
      const html = renderToString(<BentoBenefits />);
      expect(html).toContain("No tasks during class time");
      expect(html).toContain("Daily hour limit");
      expect(html).toContain("Proof of class, private by default");
      // No font-mono
      expect(html).not.toContain("font-mono");
      expect(html).toContain("Blocked");
      expect(html).toContain("3h 30m of 4h used");
      expect(html).toContain("Subject names are never shown to clients.");
    });
  });

  describe("CTA Footer Section", () => {
    it("renders footer container aligning with sections, no repeated eyebrow, no colored glow", () => {
      const html = renderToString(<CTAFooter />);
      expect(html).toContain("Ready to plan work around class?");
      expect(html).not.toContain("Built for working students and their clients");
      expect(html).toContain("Built for working students in the Philippines");
      // No blue or green glow on CTA buttons
      expect(html).not.toContain("#2563EB");
      expect(html).not.toContain("#16A34A");
      // Links
      expect(html).toContain('href="/register?role=STUDENT"');
      expect(html).toContain('href="/register?role=CLIENT"');
      expect(html).toContain('href="/login"');
      expect(html).toContain('href="/register"');
      expect(html).toContain('href="/forgot-password"');
    });
  });

  describe("Navbar", () => {
    it("renders navigation links and action buttons", () => {
      const html = renderToString(<LandingNavbar />);
      expect(html).toContain("Student VA-Hub");
      expect(html).toContain('href="/login"');
      expect(html).toContain('href="/register"');
    });
  });
});
