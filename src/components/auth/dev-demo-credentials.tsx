"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";

interface DevDemoCredentialsProps {
  onSelectEmail: (email: string) => void;
}

export function DevDemoCredentials({ onSelectEmail }: DevDemoCredentialsProps) {
  return (
    <div className="rounded-md border border-dashed border-[#E5DFD5] bg-[#FAF7F2] p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
        <KeyRound className="h-3.5 w-3.5 text-slate-500" />
        <span>Dev Demo Credentials</span>
      </div>
      <p className="text-[11px] text-slate-500">
        Click to prefill demo email. Passwords must be entered manually.
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => onSelectEmail("juan@example.com")}
          className="rounded border border-[#E5DFD5] bg-white px-2.5 py-1 text-xs font-medium text-[#0F172A] shadow-2xs hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
          Student: juan@example.com
        </button>
        <button
          type="button"
          onClick={() => onSelectEmail("maria@example.com")}
          className="rounded border border-[#E5DFD5] bg-white px-2.5 py-1 text-xs font-medium text-[#0F172A] shadow-2xs hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
          Client: maria@example.com
        </button>
      </div>
    </div>
  );
}
