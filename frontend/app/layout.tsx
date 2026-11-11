import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HospilLogix | Intelligent Healthcare Operations",
    template: "%s | HospilLogix",
  },
  description:
    "HospilLogix brings healthcare inventory and operational workflows together through an intelligent medical inventory management platform.",
  keywords: [
    "HospilLogix",
    "Healthcare Technology",
    "Medical Inventory Management",
    "Pharmacy Inventory",
    "Healthcare Operations",
  ],
  applicationName: "HospilLogix",
  authors: [{ name: "HospilLogix" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B1F3A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
