import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/context/ToastContext";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "Jay Mata Di Steel Furniture & Railing | Billing & POS",
  description: "Billing & Invoicing POS System for Jay Mata Di Steel Furniture & Railing, Bodwad (Mob: 9561482326)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 font-sans" suppressHydrationWarning>
        <ToastProvider>
          <AppLayout>{children}</AppLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
