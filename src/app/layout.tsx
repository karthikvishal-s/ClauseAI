import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider, ToastViewport } from "@/components/toast"



export const metadata: Metadata = {
  title: "Clause AI",
  description: "Legal Document Demystifyer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
        {children}
        <ToastViewport/>
        </ToastProvider>
      </body>
    </html>
  );
}

  

