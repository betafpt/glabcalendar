import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") || "betafpt@gmail.com";
  const redirectUrl = searchParams.get("redirect") || "/";

  const response = NextResponse.redirect(new URL(redirectUrl, req.url));
  response.cookies.set("glab_dev_user_email", email, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  return response;
}
