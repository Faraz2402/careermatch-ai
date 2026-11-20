import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { appUrl } from "@/lib/site-url";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

// One variable font for the whole product (headings, UI and long job descriptions).
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "CareerMatch: jobs ranked against your résumé", template: "%s · CareerMatch" },
  description: "Upload your résumé and see jobs from employer career sites across India ranked for you. Every score is computed from the complete job description, with the skills you have and the ones you're missing. Free to start.",
  applicationName: "CareerMatch AI",
  keywords: ["jobs in India", "job matching", "resume score", "ATS resume", "cover letter", "salary in India", "job search"],
  openGraph: { type: "website", siteName: "CareerMatch", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f141d" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={schibsted.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <a href="#main" className="sr-only z-[70] rounded-lg bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
