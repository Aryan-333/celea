import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

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
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
