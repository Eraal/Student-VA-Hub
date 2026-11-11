import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const isLoggedIn = !!user;
  const role = user?.role;

  // 1. Root path redirect
  if (pathname === "/") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/student", req.url));
    }
    if (role === "CLIENT") {
      return NextResponse.redirect(new URL("/client", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2. Auth pages: redirect already logged-in users to their role page
  if (pathname === "/login" || pathname === "/register") {
    if (isLoggedIn) {
      if (role === "STUDENT") {
        return NextResponse.redirect(new URL("/student", req.url));
      }
      if (role === "CLIENT") {
        return NextResponse.redirect(new URL("/client", req.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Student routes: protected, STUDENT role only
  if (pathname.startsWith("/student")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "STUDENT") {
      // Client cannot access student routes
      return NextResponse.redirect(new URL("/client", req.url));
    }
    return NextResponse.next();
  }

  // 4. Client routes: protected, CLIENT role only
  if (pathname.startsWith("/client")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "CLIENT") {
      // Student cannot access client routes
      return NextResponse.redirect(new URL("/student", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (Auth.js authentication routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
