import * as React from "react";
import Link from "next/link";
import { GraduationCap, Briefcase, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayFontClass } from "./fonts";
import { LandingContainer } from "./container";

export function CTAFooter() {
  return (
    <>
      {/* Full-width colored CTA Band */}
      <section className="bg-[#0F172A] text-white border-t-[1.5px] border-[#0F172A] py-16 sm:py-20 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />

        <LandingContainer className="relative text-center space-y-8">
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className={`${displayFontClass} text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight [text-wrap:balance]`}>
              Ready to plan work around class?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed [text-wrap:balance]">
              Create an account to get started
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/register?role=STUDENT" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto min-h-[46px] px-6 text-sm font-bold bg-white text-[#0F172A] hover:bg-[#FAF7F2] border-[1.5px] border-white shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2"
              >
                <GraduationCap className="size-4" />
                <span>Register as student</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>

            <Link href="/register?role=CLIENT" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto min-h-[46px] px-6 text-sm font-bold bg-transparent text-white hover:bg-slate-800 border-[1.5px] border-slate-400 shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2"
              >
                <Briefcase className="size-4" />
                <span>Register as client</span>
              </Button>
            </Link>
          </div>
        </LandingContainer>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5DFD5] bg-[#FAF7F2] py-12">
        <LandingContainer className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-[#0F172A] text-white">
                  <GraduationCap className="size-3.5" />
                </div>
                <span className={`${displayFontClass} font-extrabold text-sm text-[#0F172A]`}>
                  VAwise
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Built for working students in the Philippines
              </p>
            </div>

            {/* Essential Route Links (Login, Register) */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-700">
              <Link
                href="/login"
                className="hover:text-[#0F172A] hover:underline underline-offset-4"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="hover:text-[#0F172A] hover:underline underline-offset-4"
              >
                Register
              </Link>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E5DFD5] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
            <p>© {new Date().getFullYear()} VAwise. All rights reserved.</p>
          </div>
        </LandingContainer>
      </footer>
    </>
  );
}
