import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "ink" | "pink" | "surface" | "ghost";

export function Button({ variant = "ink", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    ink: "bg-ink text-white hover:bg-ink/90",
    pink: "bg-pink text-white hover:bg-pink/90",
    surface: "border border-stroke bg-surface text-ink hover:bg-white",
    ghost: "bg-transparent text-ink hover:bg-surface",
  };

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-pill px-5 text-sm font-extrabold transition duration-fast focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-press disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
