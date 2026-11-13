import * as React from "react";
import { Calendar, Send, ShieldCheck } from "lucide-react";
import { displayFontClass } from "./fonts";
import { LandingContainer } from "./container";

export function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Student plots class schedule",
      desc: "The student enters their class schedule. Every lecture and class automatically becomes protected time.",
      badge: "Class blocks",
      badgeColor: "bg-[#EFF6FF] text-[#1E40AF] border-[#2563EB]/30",
      icon: Calendar,
      detailSnippet: "10:00 AM – 12:00 PM: Class block",
    },
    {
      num: "02",
      title: "Client assigns a VA task",
      desc: "The client submits a task to their linked student assistant with deadlines and expected hours.",
      badge: "VA work",
      badgeColor: "bg-[#F0FDF4] text-[#166534] border-[#16A34A]/30",
      icon: Send,
      detailSnippet: "Task: Social media lead gen (2h)",
    },
    {
      num: "03",
      title: "System checks conflicts live",
      desc: "If a task clashes with a class, it can't be submitted. If it exceeds the daily limit, a warning is shown.",
      badge: "Conflict alert",
      badgeColor: "bg-[#FEF2F2] text-[#991B1B] border-[#DC2626]/30",
      icon: ShieldCheck,
      detailSnippet: "Conflict: Juan has class 1:00 PM – 2:30 PM",
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 py-16 sm:py-24">
      <LandingContainer>
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center rounded-full border-[1.5px] border-[#0F172A] bg-[#FAF7F2] px-3.5 py-1 text-xs font-bold text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]">
            <span>How it works</span>
          </div>
          <h2 className={`${displayFontClass} text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] [text-wrap:balance]`}>
            Three steps from class schedule to assigned task.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed [text-wrap:balance]">
            Work is planned around class time, so clashes are caught before a task is sent.
          </p>
        </div>

        {/* 3-Step Horizontal Timeline Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 relative items-stretch">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="group relative flex flex-col justify-between h-full rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 shadow-[3px_3px_0px_0px_#0F172A] transition-all duration-200 transform translate-y-0 opacity-100 motion-reduce:transform-none motion-reduce:transition-none hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_#0F172A]"
              >
                <div>
                  {/* Step Number & Icon Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#E5DFD5]">
                    <span className={`${displayFontClass} text-2xl font-black text-[#0F172A]/80 tracking-tighter tabular-nums`}>
                      {step.num}
                    </span>
                    <div className="flex size-10 items-center justify-center rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]">
                      <Icon className="size-5" />
                    </div>
                  </div>

                  {/* Step Details */}
                  <div className="pt-4 space-y-2">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold tracking-wider ${step.badgeColor}`}
                    >
                      {step.badge}
                    </span>
                    <h3 className={`${displayFontClass} text-lg font-bold text-[#0F172A] leading-snug [text-wrap:balance]`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>

                {/* Micro preview snippet at bottom */}
                <div className="mt-6 rounded-lg border border-[#E5DFD5] bg-[#FAF7F2] p-3 text-xs text-slate-700 tabular-nums">
                  <span className="block font-semibold break-words leading-relaxed">
                    {step.detailSnippet}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </LandingContainer>
    </section>
  );
}
