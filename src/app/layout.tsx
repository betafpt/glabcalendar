import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { LanguageProvider } from "@/components/language-provider";
import { ToastProvider } from "@/components/ui/toast";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "G.Lab Calendar",
  description: "Production scheduling web app for filmmakers and photographers",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className="min-h-screen bg-bg font-sans text-ink antialiased"
        style={{ fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' }}
      >
        <LanguageProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
