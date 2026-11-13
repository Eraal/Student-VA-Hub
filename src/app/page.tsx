import * as React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingNavbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { BentoBenefits } from "@/components/landing/bento-benefits";
import { AudienceComparison } from "@/components/landing/audience-comparison";
import { FAQSection } from "@/components/landing/faq";
import { CTAFooter } from "@/components/landing/cta-footer";
import { ScrollRevealer } from "@/components/landing/scroll-revealer";
import { bricolage } from "@/components/landing/fonts";
import { connection } from "next/server";

async function LandingPage() {
  await connection();
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
    <div
      className={`${bricolage.variable} min-h-screen bg-[#FAF7F2] text-[#0F172A] selection:bg-[#0F172A] selection:text-white flex flex-col font-sans`}
    >
      <ScrollRevealer />
      <LandingNavbar />
      <main className="flex-1">
        <HeroSection />
        <HowItWorks />
        <BentoBenefits />
        <AudienceComparison />
        <FAQSection />
      </main>
      <CTAFooter />
    </div>
  );
}

export default function Home() {
  return (
    <React.Suspense fallback={null}>
      <LandingPage />
    </React.Suspense>
  );
}
