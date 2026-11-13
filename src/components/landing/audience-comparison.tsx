import * as React from "react";
import Link from "next/link";
import { GraduationCap, Briefcase, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayFontClass } from "./fonts";
import { LandingContainer } from "./container";

export function AudienceComparison() {
  const studentOutcomes = [
    {
      title: "Protected class time",
      desc: "Clients can't assign tasks during your classes",
    },
    {
      title: "A daily limit you control",
      desc: "Set your own maximum hours per day",
    },
    {
      title: "Timesheets and invoices",
      desc: "Log your hours and get invoices based on your agreed hourly rate",
    },
  ];

  const clientOutcomes = [
    {
      title: "Checked before it's sent",
      desc: "Tasks are checked against the student's classes and free time before they reach them.",
    },
    {
      title: "Direct linking",
      desc: "Connect with your student using their invite code",
    },
    {
      title: "Simple approvals",
      desc: "Review logged hours and approve or dispute in one place",
    },
  ];

  return (
    <section className="py-16 sm:py-24">
      <LandingContainer className="space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center rounded-full border-[1.5px] border-[#0F172A] bg-white px-3.5 py-1 text-xs font-bold text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]">
            <span>Who is it for?</span>
          </div>
          <h2 className={`${displayFontClass} text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] [text-wrap:balance]`}>
            Built for mutual accountability and success.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed [text-wrap:balance]">
            Balanced protection: honoring student study schedules while keeping work clear and dependable for clients.
          </p>
        </div>

        {/* Two Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Column 1: For Students */}
          <div
            id="students"
            className="scroll-mt-24 rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 sm:p-8 shadow-[4px_4px_0px_0px_#0F172A] flex flex-col justify-between hover:shadow-[6px_6px_0px_0px_#0F172A] transition-all"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E5DFD5]">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#0F172A] text-white shadow-[2px_2px_0px_0px_#0F172A]">
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <span className="text-xs font-bold tracking-wider text-slate-700">
                    For working students
                  </span>
                  <h3 className={`${displayFontClass} text-xl font-bold text-[#0F172A] [text-wrap:balance]`}>
                    Plan work around your classes
                  </h3>
                </div>
              </div>

              <ul className="space-y-4">
                {studentOutcomes.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex size-6 items-center justify-center rounded-full bg-[#FAF7F2] text-[#0F172A] shrink-0 mt-0.5 border border-[#0F172A]/20">
                      <CheckCircle2 className="size-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8">
              <Link href="/register?role=STUDENT" className="block w-full">
                <Button className="w-full h-12 text-sm font-bold bg-[#0F172A] hover:bg-slate-800 text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2">
                  <GraduationCap className="size-4" />
                  <span>Register as student</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Column 2: For Clients */}
          <div
            id="clients"
            className="scroll-mt-24 rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 sm:p-8 shadow-[4px_4px_0px_0px_#0F172A] flex flex-col justify-between hover:shadow-[6px_6px_0px_0px_#0F172A] transition-all"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E5DFD5]">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#FAF7F2] text-[#0F172A] border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]">
                  <Briefcase className="size-6" />
                </div>
                <div>
                  <span className="text-xs font-bold tracking-wider text-slate-700">
                    For clients
                  </span>
                  <h3 className={`${displayFontClass} text-xl font-bold text-[#0F172A] [text-wrap:balance]`}>
                    Assign work that fits their schedule
                  </h3>
                </div>
              </div>

              <ul className="space-y-4">
                {clientOutcomes.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex size-6 items-center justify-center rounded-full bg-[#FAF7F2] text-[#0F172A] shrink-0 mt-0.5 border border-[#0F172A]/20">
                      <CheckCircle2 className="size-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8">
              <Link href="/register?role=CLIENT" className="block w-full">
                <Button
                  variant="outline"
                  className="w-full h-12 text-sm font-bold bg-white text-[#0F172A] hover:bg-[#FAF7F2] border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2"
                >
                  <Briefcase className="size-4" />
                  <span>Register as client</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
