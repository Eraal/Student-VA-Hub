import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function HomeRedirect() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "STUDENT") {
    redirect("/student");
  }

  if (session.user.role === "CLIENT") {
    redirect("/client");
  }

  redirect("/login");
  return null;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}
