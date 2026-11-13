"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayFontClass } from "./fonts";
import { LandingContainer } from "./container";

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on resize to desktop
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent background scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E5DFD5] bg-[#FAF7F2]/95 backdrop-blur-md">
      <LandingContainer className="flex h-16 items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] rounded-lg p-1"
          aria-label="VAwise Home"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#0F172A] text-white shadow-[2px_2px_0px_0px_#0F172A] transition-transform group-hover:-translate-y-0.5">
            <GraduationCap className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className={`${displayFontClass} font-extrabold tracking-tight text-[#0F172A] text-base leading-tight`}>
              VAwise
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav
          className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700"
          aria-label="Main Navigation"
        >
          <a
            href="#how-it-works"
            className="transition-colors hover:text-[#0F172A] hover:underline underline-offset-4"
          >
            How it works
          </a>
          <a
            href="#students"
            className="transition-colors hover:text-[#0F172A] hover:underline underline-offset-4"
          >
            For students
          </a>
          <a
            href="#clients"
            className="transition-colors hover:text-[#0F172A] hover:underline underline-offset-4"
          >
            For clients
          </a>
          <a
            href="#faq"
            className="transition-colors hover:text-[#0F172A] hover:underline underline-offset-4"
          >
            FAQ
          </a>
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-slate-700 hover:text-[#0F172A] hover:bg-[#EFEAE2] cursor-pointer min-h-[40px] px-3.5"
            >
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="sm"
              className="text-xs font-bold text-white bg-[#0F172A] hover:bg-slate-800 border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer min-h-[40px] px-4"
            >
              Get started
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Trigger (>= 44px tap target) */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </LandingContainer>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-menu"
          className="fixed inset-x-0 top-16 bottom-0 z-40 bg-[#FAF7F2]/98 backdrop-blur-md px-6 py-6 border-b border-[#E5DFD5] flex flex-col justify-between overflow-y-auto animate-in fade-in duration-150 md:hidden"
        >
          <nav className="flex flex-col space-y-4 pt-2">
            <a
              href="#how-it-works"
              onClick={closeMenu}
              className="flex items-center justify-between py-3 text-base font-semibold text-[#0F172A] border-b border-[#E5DFD5]/80 active:text-blue-600"
            >
              <span>How it works</span>
              <ArrowRight className="size-4 text-slate-400" />
            </a>
            <a
              href="#students"
              onClick={closeMenu}
              className="flex items-center justify-between py-3 text-base font-semibold text-[#0F172A] border-b border-[#E5DFD5]/80 active:text-blue-600"
            >
              <span>For students</span>
              <ArrowRight className="size-4 text-slate-400" />
            </a>
            <a
              href="#clients"
              onClick={closeMenu}
              className="flex items-center justify-between py-3 text-base font-semibold text-[#0F172A] border-b border-[#E5DFD5]/80 active:text-blue-600"
            >
              <span>For clients</span>
              <ArrowRight className="size-4 text-slate-400" />
            </a>
            <a
              href="#faq"
              onClick={closeMenu}
              className="flex items-center justify-between py-3 text-base font-semibold text-[#0F172A] border-b border-[#E5DFD5]/80 active:text-blue-600"
            >
              <span>FAQ</span>
              <ArrowRight className="size-4 text-slate-400" />
            </a>
          </nav>

          <div className="pt-6 pb-8 space-y-3">
            <Link href="/register" onClick={closeMenu} className="block w-full">
              <Button className="w-full h-12 text-sm font-bold bg-[#0F172A] hover:bg-slate-800 text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] cursor-pointer">
                Get started
              </Button>
            </Link>
            <Link href="/login" onClick={closeMenu} className="block w-full">
              <Button
                variant="outline"
                className="w-full h-12 text-sm font-semibold bg-white text-[#0F172A] border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2] cursor-pointer"
              >
                Log in
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
