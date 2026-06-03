import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { defaultLocale } from "@/lib/i18n/messages";
import ToastProvider from "@/components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurora Bank",
  description: "Secure and fast online banking.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let locale = defaultLocale;
  try {
    const cookieStore = await cookies();
    locale = getLocaleFromCookies(cookieStore);
  } catch (error) {
    // Fallback to default locale
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
