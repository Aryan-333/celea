import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Celea | AI-Native Video Automation for Hollywood",
  description:
    "Transform your video production with AI-powered automation. Generate cinematic videos with intelligent refinement loops using GPT-4o, Veo 3.1, and Gemini 2.5 Pro.",
  keywords: [
    "AI video generation",
    "Hollywood automation",
    "video production",
    "Veo 3.1",
    "GPT-4o",
    "Gemini",
    "cinematic AI",
  ],
  authors: [{ name: "Celea" }],
  icons: {
    icon: "/celea-logo.png",
    shortcut: "/celea-logo.png",
    apple: "/celea-logo.png",
  },
  openGraph: {
    title: "Celea | AI-Native Video Automation for Hollywood",
    description:
      "Transform your video production with AI-powered automation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Satoshi Font from Fontshare */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${jetbrainsMono.variable} font-satoshi antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
