import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { locales, isValidLocale } from "@/i18n";
import type { Locale } from "@/i18n";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { NextIntlProvider } from "@/components/providers/next-intl-provider";
import { direction } from "@/lib/styles/logical";
import { ConditionalHeader } from "@/components/layout/conditional-header";
import { getMessages } from "@/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: RootLayoutProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    return {
      title: "ITQAN | Content Management System",
      description: "A modern content management system",
    };
  }

  const validatedLocale = locale as Locale;

  return {
    title:
      validatedLocale === "ar"
        ? "إتقان | نظام إدارة المحتوى"
        : "ITQAN | Content Management System",
    description:
      validatedLocale === "ar"
        ? "منصة إتقان لإدارة المحتوى القرآني - حلول متقدمة تربط الناشرين بالمطورين والمستخدمين في بيئة تقنية متكاملة"
        : "ITQAN Quranic Content Management Platform - Advanced solutions connecting publishers with developers and users in an integrated technical environment",
  };
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { locale } = await params;

  // Validate locale with proper type safety
  if (!isValidLocale(locale)) {
    notFound();
  }

  // Type assertion after validation
  const validatedLocale = locale as Locale;
  const isRTL = direction.isRTL(validatedLocale);
  const dir = direction.getDir(validatedLocale);
  const messages = await getMessages(validatedLocale);

  return (
    <html lang={validatedLocale} dir={dir} suppressHydrationWarning>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "antialiased",
          isRTL && "font-arabic",
          "bg-[#F8F8F8]"
        )}
      >
        <ThemeProvider>
          <NextIntlProvider locale={validatedLocale} messages={messages}>
            <AuthProvider locale={validatedLocale}>
              <ConditionalHeader locale={validatedLocale} />
              <main className="pt-16">{children}</main>
            </AuthProvider>
          </NextIntlProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
