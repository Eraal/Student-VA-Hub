import * as React from "react";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-8">
      <React.Suspense
        fallback={
          <div className="w-full max-w-md rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 animate-pulse h-80" />
        }
      >
        <RegisterForm />
      </React.Suspense>
    </main>
  );
}
