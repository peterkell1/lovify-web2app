import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Brand typefaces for the v3 onboarding funnel. The theme tokens in
// src/components/onboarding/v3/theme.ts reference these via the CSS variables
// below (SANS → --font-montserrat, SERIF → --font-playfair). Both are variable
// fonts, so no weight list is needed. This matches the fonts the lovifymusic
// preview loads via Google Fonts, so /start renders identically here.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lovify",
  description: "Your life, your song — Lovify turns your story into music.",
};

// App-like funnel: lock the zoom level. Without maximumScale, iOS zooms in
// when an input gets focus and never zooms back out, leaving the chat layout
// off-center with buttons pushed off-screen (paired with ≥16px input fonts,
// which stop the auto-zoom trigger itself).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
