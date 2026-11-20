import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700", "800"] });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "HunnyDo: fix it once, keep your crew",
  description:
    "Snap a photo of what broke. HunnyDo diagnoses it, finds the local pros most likely to show up, and keeps every quote in one place.",
};

export const viewport: Viewport = { themeColor: "#FFC629", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
