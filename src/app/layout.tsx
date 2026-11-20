import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700", "800"] });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });

// Render every page per request. Otherwise the CDN in front of the app keeps prerendered pages for a year
// and visitors can be handed a stale page after a deploy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HunnyDo: fix it once, keep your crew",
  description:
    "Something broke and you don't own the right wrench. Snap a photo. HunnyDo works out what's wrong, finds the local pros most likely to show up, and keeps every quote in one place.",
};

export const viewport: Viewport = { themeColor: "#16161A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
