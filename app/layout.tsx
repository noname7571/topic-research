import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Sora } from "next/font/google";

import { UserNav } from "@/components/user-nav";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Discourse Intelligence Engine",
  description:
    "Understand what the internet actually thinks with signal-first discourse intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${ibmPlexMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-6 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
            Discourse IQ
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/about" className="text-sm font-semibold text-slate-700">
              About
            </Link>
            <Link href="/pricing" className="text-sm font-semibold text-slate-700">
              Pricing
            </Link>
            <Link href="/legal" className="text-sm font-semibold text-slate-700">
              Legal
            </Link>
            <UserNav />
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
