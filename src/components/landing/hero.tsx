import * as React from "react";
import Link from "next/link";
import { GraduationCap, Briefcase, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveDemo } from "./interactive-demo";
import { displayFontClass } from "./fonts";
import { LandingContainer } from "./container";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-18 lg:pb-28">
      {/* Faint subtle grid/paper texture */}
      <div
        className="absolute inset-0 -z-10 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(#CBD5E1 1px, transparent 1px), radial-gradient(#CBD5E1 1px, #FAF7F2 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 12px 12px",
        }}
        aria-hidden="true"
      />

      <LandingContainer>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Hero Content */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center rounded-full border-[1.5px] border-[#0F172A] bg-white px-3.5 py-1 text-xs font-bold text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]">
              <span>Built for working students and their clients</span>
            </div>

            {/* Headline with hand-drawn style underline on "without sacrificing" */}
            <h1
              className={`${displayFontClass} text-3xl sm:text-5xl lg:text-5xl font-black tracking-tight text-[#0F172A] leading-[1.12] [text-wrap:balance]`}
            >
              Work as a VA{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10">without sacrificing</span>
                {/* Hand-drawn style SVG underline in ink */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-[#0F172A] z-0 overflow-visible"
                  viewBox="0 0 250 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8.5C45 2.5 125 1.5 247 6.5C185 10.5 80 11.5 15 10"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              your studies.
            </h1>

            {/* Subtext */}
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-xl">
              Student VA-Hub checks every task against the student&apos;s class schedule before it&apos;s sent, so work is planned around class time. Fewer clashes, clearer limits, no last-minute surprises.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link href="/register?role=STUDENT" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto min-h-[46px] px-6 text-sm font-bold bg-[#0F172A] hover:bg-slate-800 text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2"
                >
                  <GraduationCap className="size-4" />
                  <span>Register as student</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>

              <Link href="/register?role=CLIENT" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto min-h-[46px] px-6 text-sm font-bold bg-white text-[#0F172A] hover:bg-[#FAF7F2] border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2"
                >
                  <Briefcase className="size-4" />
                  <span>Register as client</span>
                </Button>
              </Link>
            </div>

            {/* Hero chips */}
            <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-1.5">
                <div className="flex size-4 items-center justify-center rounded-full bg-[#16A34A] text-white">
                  <Check className="size-2.5 stroke-[3]" />
                </div>
                <span>Class time protected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex size-4 items-center justify-center rounded-full bg-[#2563EB] text-white">
                  <Check className="size-2.5 stroke-[3]" />
                </div>
                <span>Conflicts blocked before sending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex size-4 items-center justify-center rounded-full bg-[#0F172A] text-white">
                  <Check className="size-2.5 stroke-[3]" />
                </div>
                <span>Daily hour limit</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Demo Showcase */}
          <div className="lg:col-span-6">
            <InteractiveDemo />
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
