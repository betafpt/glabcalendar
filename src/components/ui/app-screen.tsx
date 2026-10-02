import type { HTMLAttributes } from "react";

export function AppScreen({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto w-full max-w-screen-2xl px-4 pb-36 pt-6 sm:px-6 lg:px-10 lg:pb-10 ${className}`} {...props} />;
}
