"use server";

import { signIn, signOut } from "@/auth";

export async function loginWithGoogleAction(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
