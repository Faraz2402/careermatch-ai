import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { appUrl } from "@/lib/site-url";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { PointerGlow } from "@/components/pointer-glow";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "CareerMatch AI: AI Résumé Builder & Job Matching for India", template: "%s · CareerMatch AI" },
  description: "Upload your résumé and get jobs ranked for you across India and worldwide: match scores with reasons, skill gaps, employer apply links, salaries in ₹, and AI-tailored résumés and cover letters. Free to start.",
  applicationName: "CareerMatch AI",
  keywords: ["AI resume builder", "ATS resume", "job matching", "jobs in India", "resume score", "cover letter generator", "salary in India", "job search"],
  openGraph: { type: "website", siteName: "CareerMatch AI", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable} ${playfair.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <a href="#main" className="sr-only z-[70] rounded-lg bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Skip to content
        </a>
        <PointerGlow />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
