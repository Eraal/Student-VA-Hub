import * as React from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function LoginPage() {
  return (
    <AuthLayout mode="login">
      <React.Suspense
        fallback={
          <div className="w-full space-y-4 animate-pulse">
            <div className="h-6 w-48 rounded bg-[#E5DFD5]/50" />
            <div className="h-4 w-60 rounded bg-[#E5DFD5]/40" />
            <div className="h-9 w-full rounded bg-[#E5DFD5]/30 mt-6" />
            <div className="h-9 w-full rounded bg-[#E5DFD5]/30" />
            <div className="h-9 w-full rounded bg-[#0F172A]/20" />
          </div>
        }
      >
        <LoginForm />
      </React.Suspense>
    </AuthLayout>
  );
}
