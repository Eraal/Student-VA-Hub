"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap, ShieldAlert, EyeOff, Clock, ArrowLeft } from "lucide-react";
import { displayFontClass } from "@/components/landing/fonts";
import { Role } from "@prisma/client";

export interface AuthLayoutProps {
  children: React.ReactNode;
  role?: Role | null;
  mode?: "register" | "login" | "reset-password";
}

export function AuthLayout({ children, role, mode = "login" }: AuthLayoutProps) {
  let headline = "Pick up right where you left off.";
  let subtitle = "Your class schedule, available work windows, and timesheets in one place.";

  if (mode === "register") {
    if (role === Role.CLIENT) {
      headline = "Assign tasks that fit your student's schedule.";
      subtitle = "Every task is checked against your student's classes and available hours before it's sent.";
    } else {
      headline = "Work around your classes, not through them.";
      subtitle = "Your class schedule is the source of truth—clients can only book your free windows.";
    }
  } else if (mode === "reset-password") {
    headline = "Pick up right where you left off.";
    subtitle = "Your class schedule, available work windows, and timesheets in one place.";
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white text-[#0F172A]">
      {/* Left Panel: System Slate Dark Editorial Showcase */}
      <aside className="hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-[#0F172A] text-slate-50 border-r border-slate-800 relative overflow-hidden">
        {/* Subtle Texture: slate-700 whisper-quiet dot matrix in the background */}
        <div
          className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40"
          aria-hidden="true"
        />

        {/* Top Brand Header & Back to home */}
        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 w-fit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded-md"
            aria-label="VAwise Home"
          >
            <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-100 shadow-2xs">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className={`${displayFontClass} text-sm font-semibold tracking-tight text-white`}>
              VAwise
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to home</span>
          </Link>
        </div>

        {/* Middle Editorial Copy (Dynamic by Route & Selected Role) */}
        <div className="my-auto max-w-md space-y-6 relative z-10">
          <div className="space-y-2">
            <h1 className={`${displayFontClass} text-3xl font-semibold tracking-tight text-white leading-tight`}>
              {headline}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* 3 Minimal Editorial Value Rows */}
          <div className="pt-2 space-y-3.5 border-t border-slate-800/80">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-medium text-white">Hard conflict blocking.</span> Overlapping class hours automatically block task submissions.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <EyeOff className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-medium text-white">Subject-level privacy.</span> Clients only see busy blocks, never your course or subject names.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-medium text-white">Verified timesheets.</span> Track Time In/Out and approve hours with automatic invoice totals.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between">
          <span>VAwise · Asia/Manila (UTC+8)</span>
        </div>
      </aside>

      {/* Right Panel: Clean Borderless Form Canvas */}
      <main className="relative flex flex-col items-center justify-center p-6 sm:p-12 bg-white min-h-screen lg:min-h-full">
        {/* Mobile Brand Header & Back to home */}
        <div className="flex lg:hidden items-center justify-between w-full max-w-[380px] mb-8">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="VAwise Home"
          >
            <div className="h-7 w-7 rounded-md bg-[#0F172A] text-white flex items-center justify-center shadow-2xs">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className={`${displayFontClass} font-semibold text-sm text-[#0F172A]`}>VAwise</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0F172A] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to home</span>
          </Link>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[380px] space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
