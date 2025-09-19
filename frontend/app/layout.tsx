import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Helixque",
  description: "Connect with professionals worldwide through Helixque's real-time video chat platform. Match based on preferences, network effectively, and build meaningful professional relationships.",
  keywords: ["professional networking", "video chat", "business meetings", "professional connections", "WebRTC", "real-time communication"],
  authors: [{ name: "Helixque Team" }],
  openGraph: {
    title: "Helixque",
    description: "Connect with professionals worldwide through real-time video chat. Match based on preferences and build meaningful business relationships.",
    type: "website",
    siteName: "Helixque",
  },
  twitter: {
    card: "summary_large_image",
    title: "Helixque",
    description: "Connect with professionals worldwide through real-time video chat platform.",
  },
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
