import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

// One webfont, for headings. Body text uses whatever the device already has.
const display = Archivo({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "HunnyDo: fix it once, keep your crew",
  description:
    "Snap a photo of what broke. HunnyDo diagnoses it, finds the local pros most likely to show up, and keeps every quote in one place.",
};

export const viewport: Viewport = { themeColor: "#16161A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
