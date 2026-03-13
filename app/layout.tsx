import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Instrument_Serif } from "next/font/google";
import { Fira_Code } from "next/font/google";

import "./globals.css";
import Navbar from "./components/Navbar/nav";
import Footer from "@/app/components/footer/footer";
import Analytics from "./analytics";
import Script from "next/script";
import PWAInstallPrompt from "./components/pwainstallprompt";
import InboxToast from "@/components/InboxToast";
import { GoogleOAuthProvider } from "@react-oauth/google";
/* import "@/app/com/void-community.css"; */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sahiphoto | Document Resizer",
  description:
    "Free government exam photo and signature resizer. Resize images for SSC, UPSC, AFCAT, JEE, NEET, BPSC, Railway RRB and 100+ exams. Instant resizing without signup. Updated 2026 requirements.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "SahiPhoto",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} ${instrumentSerif.variable} ${firaCode.variable}`}
    >
      <head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SahiPhoto" />
        <link rel="apple-touch-icon" href="/icon.svg" />

        {/* SW preload hint */}
        {/* <link rel="preload" href="/sw.js" as="script" /> */}
      </head>

      {/* Google Analytics */}
      {/* <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-2CX68W0JWB"
        strategy="afterInteractive"
      />
      <Script id="ga-script" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', 'G-2CX68W0JWB', { send_page_view: false });
        `}
      </Script>
 */}
      <body>
        {/* <Analytics /> */}
        {/* <Navbar /> */}
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
          {children}
        </GoogleOAuthProvider>
        <InboxToast />
        {/* <Footer /> */}
        <PWAInstallPrompt></PWAInstallPrompt>
      </body>
    </html>
  );
}
