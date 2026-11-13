import * as React from "react";
import {
  CalendarX2,
  ShieldAlert,
  Lock,
  AlertCircle,
  EyeOff,
} from "lucide-react";
import { displayFontClass } from "./fonts";
import { LandingContainer } from "./container";

export function BentoBenefits() {
  return (
    <section className="py-16 sm:py-24 bg-[#F5F0E8]/50 border-y border-[#E5DFD5]">
      <LandingContainer className="space-y-12">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center rounded-full border-[1.5px] border-[#0F172A] bg-white px-3.5 py-1 text-xs font-bold text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]">
            <span>Why Student VA-Hub?</span>
          </div>
          <h2 className={`${displayFontClass} text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] [text-wrap:balance]`}>
            Built for the real lives of working students.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed [text-wrap:balance]">
            Every feature is designed to protect academic standing while supporting reliable freelance delivery.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Bento Item 1: Conflict card (Span 7 cols) */}
          <div className="md:col-span-7 rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 sm:p-8 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between hover:shadow-[5px_5px_0px_0px_#0F172A] transition-all">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20">
                  <CalendarX2 className="size-5" />
                </span>
                <span className="text-xs font-bold tracking-wider text-[#2563EB]">
                  Class protection
                </span>
              </div>

              <div className="space-y-2">
                <h3 className={`${displayFontClass} text-xl sm:text-2xl font-bold text-[#0F172A] [text-wrap:balance]`}>
                  No tasks during class time
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
                  The class schedule is checked first. If a client tries to assign work during class, the task can&apos;t be submitted.
                </p>
              </div>
            </div>

            {/* Mini-UI Snippet: Live Clash Blocker */}
            <div className="mt-6 rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-4 text-[#991B1B] shadow-[2px_2px_0px_0px_#DC2626]">
              <div className="flex items-center justify-between pb-2 border-b border-[#DC2626]/20">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <AlertCircle className="size-4 text-[#DC2626]" />
                  <span>Assign task: Graphic banner</span>
                </div>
                <span className="font-sans text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold tabular-nums">
                  Blocked
                </span>
              </div>
              <p className="text-xs text-red-900 mt-2 font-medium">
                &ldquo;Conflict! Juan has class Monday 1:00 PM – 2:30 PM.&rdquo;
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-red-700 font-medium">
                <span>Attempted: 1:30 PM</span>
                <span className="text-slate-600">This task can&apos;t be submitted</span>
              </div>
            </div>
          </div>

          {/* Bento Item 2: Daily limit card (Span 5 cols) */}
          <div className="md:col-span-5 rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 sm:p-8 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between hover:shadow-[5px_5px_0px_0px_#0F172A] transition-all">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#D97706] border border-[#D97706]/20">
                  <ShieldAlert className="size-5" />
                </span>
                <span className="text-xs font-bold tracking-wider text-[#D97706]">
                  Daily limit
                </span>
              </div>

              <div className="space-y-2">
                <h3 className={`${displayFontClass} text-xl sm:text-2xl font-bold text-[#0F172A] [text-wrap:balance]`}>
                  Daily hour limit
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Each student sets a daily maximum, such as 4 hours. If a task would go over it, the client sees a warning and the student decides whether to accept.
                </p>
              </div>
            </div>

            {/* Mini-UI Snippet: Daily 4h Capacity Meter */}
            <div className="mt-6 rounded-xl border border-[#E5DFD5] bg-[#FAF7F2] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0F172A]">Today&apos;s capacity</span>
                <span className="font-sans font-bold tabular-nums text-xs text-[#D97706]">
                  3h 30m of 4h used
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#E5DFD5] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-[#D97706] transition-all duration-500"
                  style={{ width: "87.5%" }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span>Daily maximum: 4h</span>
                <span className="text-[#D97706] font-semibold">30m remaining</span>
              </div>
            </div>
          </div>

          {/* Bento Item 3: Privacy card (Span 12 cols full-width band) */}
          <div className="md:col-span-12 rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 sm:p-8 shadow-[3px_3px_0px_0px_#0F172A] hover:shadow-[5px_5px_0px_0px_#0F172A] transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#0F172A] text-white">
                    <Lock className="size-5" />
                  </span>
                  <span className="text-xs font-bold tracking-wider text-[#0F172A]">
                    Privacy
                  </span>
                </div>
                <h3 className={`${displayFontClass} text-xl sm:text-2xl font-bold text-[#0F172A] [text-wrap:balance]`}>
                  Proof of class, private by default
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Clients see that the student is in class and when. Subject names are never shown to clients.
                </p>
              </div>

              {/* Side-by-side comparison mini-UI */}
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Student View */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-blue-700">
                      Student view
                    </span>
                    <span className="size-2 rounded-full bg-blue-600" />
                  </div>
                  <p className="text-xs font-bold text-blue-900">
                    CS 201
                  </p>
                  <p className="text-xs text-blue-700">
                    1:00 PM – 2:30 PM
                  </p>
                </div>

                {/* Client View */}
                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-slate-700 flex items-center gap-1">
                      <EyeOff className="size-3.5" /> Client view
                    </span>
                    <span className="size-2 rounded-full bg-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    In class
                  </p>
                  <p className="text-xs text-slate-600">
                    1:00 PM – 2:30 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
