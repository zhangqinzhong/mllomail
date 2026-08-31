import { NextIntlClientProvider } from "next-intl"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { i18n, type Locale } from "@/i18n/config"
import type { Metadata, Viewport } from "next"
import { FloatMenu } from "@/components/float-menu"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import { zpix } from "../fonts"
import "../globals.css"
import { Providers } from "../providers"

export const runtime = "edge"

export const viewport: Viewport = {
  themeColor: '#826DD9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

async function getMessages(locale: Locale) {
  try {
    const common = (await import(`@/i18n/messages/${locale}/common.json`)).default
    const home = (await import(`@/i18n/messages/${locale}/home.json`)).default
    const auth = (await import(`@/i18n/messages/${locale}/auth.json`)).default
    const metadata = (await import(`@/i18n/messages/${locale}/metadata.json`)).default
    const emails = (await import(`@/i18n/messages/${locale}/emails.json`)).default
    const profile = (await import(`@/i18n/messages/${locale}/profile.json`)).default
    return { common, home, auth, metadata, emails, profile }
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error)
    return { common: {}, home: {}, auth: {}, metadata: {}, emails: {}, profile: {} }
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: localeFromParams } = await params
  const locale = localeFromParams as Locale
  const t = await getTranslations({ locale, namespace: "metadata" })

  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.CUSTOM_DOMAIN
  const baseUrl = configuredBaseUrl
    ? (/^https?:\/\//i.test(configuredBaseUrl) ? configuredBaseUrl : `https://${configuredBaseUrl}`).replace(/\/$/, "")
    : "http://localhost:3000"
  
  // Generate hreflang links for all supported locales
  const languages: Record<string, string> = {}
  i18n.locales.forEach((loc) => {
    languages[loc] = loc === i18n.defaultLocale ? baseUrl : `${baseUrl}/${loc}`
  })

  const canonicalUrl = locale === i18n.defaultLocale ? baseUrl : `${baseUrl}/${locale}`

  return {
    metadataBase: new URL(baseUrl),
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    authors: [{ name: "MlloMail" }],
    creator: "MlloMail",
    publisher: "MlloMail",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "zh-CN" ? "zh_CN" : locale === "zh-TW" ? "zh_TW" : locale,
      url: canonicalUrl,
      title: t("title"),
      description: t("description"),
      siteName: "MlloMail",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    manifest: '/manifest.json',
    icons: [
      { rel: 'apple-touch-icon', url: '/icons/mllomail-logo-192.png' },
    ],
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: localeFromParams } = await params
  const locale = localeFromParams as Locale
  if (!i18n.locales.includes(locale)) {
    notFound()
  }

  const messages = await getMessages(locale)

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="application-name" content="MlloMail" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MlloMail" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body 
        className={cn(
          zpix.variable,
          "font-zpix min-h-screen antialiased",
          "bg-background text-foreground",
          "transition-colors duration-300"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="temp-mail-theme"
        >
          <Providers>
            <NextIntlClientProvider locale={locale} messages={messages}>
              {children}
              <FloatMenu />
            </NextIntlClientProvider>
          </Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
