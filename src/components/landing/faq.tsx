"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { displayFontClass } from "./fonts";
import { LandingContainer } from "./container";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: "faq-privacy",
    question: "Can clients see my subjects?",
    answer:
      "No. Clients only see an 'In class' block with the time. Subject names are never shown to them.",
  },
  {
    id: "faq-payments",
    question: "Does VAwise handle payments?",
    answer:
      "Not yet. The app tracks hours and invoices. Payment is arranged directly between the student and client.",
  },
  {
    id: "faq-linking",
    question: "How do students and clients connect?",
    answer:
      "The student shares an invite code from their profile. The client enters it and sets the hourly rate.",
  },
  {
    id: "faq-limit",
    question: "Is there a daily limit?",
    answer:
      "Each student sets a daily maximum. Tasks that would exceed it show a warning, and the student decides whether to accept.",
  },
];

export function FAQSection() {
  const [openIds, setOpenIds] = React.useState<Record<string, boolean>>({
    "faq-privacy": true, // First open by default for immediate context
  });

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section id="faq" className="scroll-mt-20 py-16 sm:py-24 bg-[#F5F0E8]/50 border-t border-[#E5DFD5]">
      <LandingContainer className="space-y-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center rounded-full border-[1.5px] border-[#0F172A] bg-white px-3.5 py-1 text-xs font-bold text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]">
              <span>FAQ</span>
            </div>
            <h2 className={`${displayFontClass} text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] [text-wrap:balance]`}>
              Frequently asked questions
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
              Common questions about schedule protection, privacy, and how VAwise works.
            </p>
          </div>

          {/* Accordion List */}
          <div className="space-y-4">
            {FAQS.map((faq) => {
              const isOpen = Boolean(openIds[faq.id]);
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] transition-all overflow-hidden"
                >
                  <button
                    type="button"
                    id={`button-${faq.id}`}
                    onClick={() => toggleItem(faq.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleItem(faq.id);
                      }
                    }}
                    aria-expanded={isOpen}
                    aria-controls={`content-${faq.id}`}
                    className="w-full flex items-center justify-between p-5 sm:p-6 text-left cursor-pointer hover:bg-[#FAF7F2]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
                  >
                    <span className="text-sm sm:text-base font-bold text-[#0F172A] pr-4">
                      {faq.question}
                    </span>
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#0F172A] transition-colors duration-200 ${
                        isOpen ? "bg-[#0F172A] text-white" : "bg-[#FAF7F2] text-[#0F172A]"
                      }`}
                      aria-hidden="true"
                    >
                      <ChevronDown
                        className={`size-4 stroke-[2.5] transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-white" : "text-[#0F172A]"
                        }`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      id={`content-${faq.id}`}
                      role="region"
                      aria-labelledby={`button-${faq.id}`}
                      className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm text-slate-700 leading-relaxed border-t border-[#E5DFD5] pt-4 animate-in fade-in duration-150"
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
