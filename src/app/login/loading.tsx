export default function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="w-full max-w-[380px] space-y-4 animate-pulse">
        <div className="h-6 w-48 rounded bg-[#E5DFD5]/50" />
        <div className="h-4 w-60 rounded bg-[#E5DFD5]/40" />
        <div className="h-9 w-full rounded bg-[#E5DFD5]/30 mt-6" />
        <div className="h-9 w-full rounded bg-[#E5DFD5]/30" />
        <div className="h-9 w-full rounded bg-[#0F172A]/20" />
      </div>
    </main>
  );
}
