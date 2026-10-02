import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";
  const isAuthenticated = Boolean(req.auth);

  // If already authenticated and on login page, redirect to today dashboard
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // In production mode, enforce authentication on protected application routes
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !isAuthenticated && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
