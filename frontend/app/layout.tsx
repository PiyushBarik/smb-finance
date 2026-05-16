import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ClarityBooks — SMB Finance Clarity",
  description: "GST reconciliation, expense categorisation, and plain-English CFO insights for Indian small businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="bg-zinc-950 text-white antialiased min-h-screen">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
