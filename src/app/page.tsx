import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react";

async function LandingContent() {
  const session = await auth();

  // If already logged in, redirect directly to role dashboard
  if (session?.user) {
    if (session.user.role === "STUDENT") {
      redirect("/student");
    } else if (session.user.role === "CLIENT") {
      redirect("/client");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col text-[var(--color-text)] selection:bg-[var(--color-accent)] selection:text-[var(--color-accent-fg)]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm px-4 md:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-xs">
            <GraduationCap className="size-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">Student VA-Hub</span>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs cursor-pointer">
              Log In
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="sm"
              className="text-xs cursor-pointer bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:opacity-90 shadow-xs"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="px-4 py-16 md:py-24 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-muted)] shadow-xs">
            <span className="size-1.5 rounded-full bg-[var(--color-work)]" />
            <span>Schedule-aware platform para sa working students at clients</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[var(--color-text)] max-w-2xl mx-auto leading-tight">
            Magtrabaho bilang VA nang hindi nasasakripisyo ang pag-aaral.
          </h1>

          <p className="text-sm sm:text-base text-[var(--color-muted)] max-w-xl mx-auto leading-relaxed">
            Ginagawang batayan ang iyong academic class schedule upang maiwasan ang conflict, protektahan ang kalusugan mula sa burnout, at mapanatili ang propesyonal na ugnayan sa client.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register?role=STUDENT" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto text-xs sm:text-sm font-semibold h-11 px-6 cursor-pointer bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:opacity-90 gap-2 shadow-xs"
              >
                <GraduationCap className="size-4" />
                <span>Register as Student VA</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>

            <Link href="/register?role=CLIENT" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-xs sm:text-sm font-semibold h-11 px-6 cursor-pointer gap-2 border-[var(--color-border)] hover:bg-[var(--color-surface)]"
              >
                <Briefcase className="size-4" />
                <span>Hire a Working Student</span>
              </Button>
            </Link>
          </div>
        </section>

        {/* Reference Screen Preview / Showcase (Linear style) */}
        <section className="px-4 pb-16 max-w-4xl mx-auto">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-red-400" />
                <div className="size-2.5 rounded-full bg-amber-400" />
                <div className="size-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-[var(--color-muted)] ml-2">
                  live-conflict-engine.ts
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Asia/Manila (UTC+8)
              </Badge>
            </div>

            {/* Mock Reference Interactive State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Conflict Prevention Alert Mock */}
              <div className="rounded-md border border-[var(--color-conflict)]/40 bg-[var(--color-conflict-bg)] p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-[var(--color-conflict)]">
                  <AlertCircle className="size-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Conflict Detected — Client Blocked
                  </span>
                </div>
                <p className="text-xs text-[var(--color-conflict)] opacity-95">
                  May klase ang student mula 1:00 PM – 2:30 PM. Hindi maaaring mag-assign ng task sa oras na ito.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-conflict)] pt-1 border-t border-[var(--color-conflict)]/20">
                  <Lock className="size-3" />
                  <span>Subject name strictly redacted para sa privacy ng mag-aaral.</span>
                </div>
              </div>

              {/* Verified Availability Mock */}
              <div className="rounded-md border border-[var(--color-work)]/40 bg-[var(--color-work-bg)] p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-[var(--color-work)]">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Available Slot Approved
                  </span>
                </div>
                <p className="text-xs text-[var(--color-work)] opacity-95">
                  6:00 PM – 9:00 PM &bull; Pasok sa daily capacity (Max 4h/day). Ligtas at beripikadong oras.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-work)] pt-1 border-t border-[var(--color-work)]/20">
                  <ShieldCheck className="size-3" />
                  <span>Protektado laban sa burnout at labis na pagtatrabaho.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Core Benefits (SPEC §14) */}
        <section className="px-4 py-12 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
                Bakit Student VA-Hub?
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] max-w-lg mx-auto">
                Tatlong pangunahing benepisyo na dinisenyo para sa kapakanan ng mag-aaral at kapanatagan ng client.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Benefit 1: No more clashes */}
              <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
                <CardContent className="p-5 space-y-2.5">
                  <div className="flex size-8 items-center justify-center rounded-md bg-[var(--color-class-bg)] text-[var(--color-class)]">
                    <Calendar className="size-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    Walang Schedule Clashes
                  </h3>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                    Ang academic schedule ang primary source of truth. Awtomatikong hinaharang ng conflict detector ang pag-assign ng trabaho sa oras ng klase.
                  </p>
                </CardContent>
              </Card>

              {/* Benefit 2: Burnout Protection */}
              <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
                <CardContent className="p-5 space-y-2.5">
                  <div className="flex size-8 items-center justify-center rounded-md bg-[var(--color-work-bg)] text-[var(--color-work)]">
                    <ShieldCheck className="size-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    Burnout Protection
                  </h3>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                    May strict daily capacity limit (hal. 4h max). Makikita ang live warnings kapag malapit na sa limitasyon upang mapangalagaan ang pahinga.
                  </p>
                </CardContent>
              </Card>

              {/* Benefit 3: Proof of Class */}
              <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
                <CardContent className="p-5 space-y-2.5">
                  <div className="flex size-8 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
                    <Lock className="size-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    Proof of Class (Privacy-First)
                  </h3>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                    Nakikita ng client na beripikadong may klase ang student nang hindi inilalantad ang sensitibong kurso o subject names.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-8 text-center text-xs text-[var(--color-muted)] space-y-2">
        <p className="font-medium text-[var(--color-text)]">Student VA-Hub</p>
        <p>
          Binuo para sa Filipino working students at sa kanilang mga pinagkakatiwalaang clients.
        </p>
        <div className="pt-2 flex justify-center gap-4 text-[11px]">
          <Link href="/login" className="hover:underline">
            Login
          </Link>
          <Link href="/register" className="hover:underline">
            Register
          </Link>
          <Link href="/forgot-password" className="hover:underline">
            Forgot Password
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <React.Suspense fallback={null}>
      <LandingContent />
    </React.Suspense>
  );
}
