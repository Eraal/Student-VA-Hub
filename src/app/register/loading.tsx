export default function RegisterLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-8">
      <div className="w-full max-w-md rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 animate-pulse">
        <div className="h-6 w-36 rounded bg-[var(--color-border)]" />
        <div className="h-4 w-56 rounded bg-[var(--color-border)]" />
        <div className="h-10 w-full rounded bg-[var(--color-border)]" />
        <div className="h-10 w-full rounded bg-[var(--color-border)]" />
        <div className="h-10 w-full rounded bg-[var(--color-border)]" />
        <div className="h-10 w-full rounded bg-[var(--color-border)]" />
      </div>
    </main>
  );
}

