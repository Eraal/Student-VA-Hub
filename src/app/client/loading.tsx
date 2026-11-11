export default function ClientLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-8 md:py-12">
      <div className="mx-auto max-w-screen-md space-y-6 animate-pulse">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="h-8 w-40 rounded bg-[var(--color-border)]" />
          <div className="h-8 w-20 rounded bg-[var(--color-border)]" />
        </div>
        <div className="h-40 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
          <div className="h-6 w-32 rounded bg-[var(--color-border)]" />
          <div className="h-4 w-48 rounded bg-[var(--color-border)]" />
          <div className="h-16 rounded bg-[var(--color-border)]" />
        </div>
      </div>
    </div>
  );
}
