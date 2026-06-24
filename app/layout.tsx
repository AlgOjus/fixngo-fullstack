import React from "react";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { Wrench, MapPin, ClipboardList, Activity, User, Compass } from "lucide-react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "FixNGo | Action-Driven Civic Infrastructure Dispatch",
  description: "Automated spatial deduplication, real-time dispatching, and verified resolutions for localized civic infrastructure issues.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-slate-950 text-slate-100 font-sans min-h-screen flex flex-col`}
      >
        {/* Responsive, dark-themed persistent Navigation Bar */}
        <header id="persistent-header" className="sticky top-0 z-50 w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo initials and title */}
            <div className="flex items-center gap-6">
              <Link id="nav-brand-link" href="/" className="flex items-center gap-3 group">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-slate-950 font-black px-3 py-1.5 rounded-xl leading-none font-mono text-lg shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-transform group-hover:scale-105">
                  FG
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight text-white font-display">
                    FixN<span className="text-orange-500">Go</span>
                  </span>
                  <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-400 font-semibold tracking-widest uppercase align-middle">
                    Dispatch System
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav id="desktop-nav" className="hidden md:flex items-center gap-1 text-sm font-medium">
                <Link
                  id="nav-dispatch-link"
                  href="/dispatch"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900/50 transition-all"
                >
                  <Activity className="w-4 h-4 text-orange-500" />
                  <span>Dispatch Feed</span>
                </Link>
                <Link
                  id="nav-citizen-link"
                  href="/citizen"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900/50 transition-all"
                >
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Citizen Hub</span>
                </Link>
                <Link
                  id="nav-guest-link"
                  href="/guest"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900/50 transition-all"
                >
                  <Compass className="w-4 h-4 text-pink-400" />
                  <span>Guest Report</span>
                </Link>
                <Link
                  id="nav-worker-link"
                  href="/worker"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900/50 transition-all"
                >
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  <span>Resolver Dispatch</span>
                </Link>
              </nav>
            </div>

            {/* Profile Info badge */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-200">Arjun Sharma</div>
                <div className="text-[10px] text-orange-500 font-bold tracking-wider uppercase">
                  Sadak Sipahi • 130 PTS
                </div>
              </div>
              <div className="w-9 h-9 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center font-bold text-orange-500 shadow-inner">
                AS
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer id="persistent-footer" className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} FixNGo. Action-Driven Civic Infrastructure Dispatch. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
