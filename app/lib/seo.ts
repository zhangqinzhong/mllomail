import type { Metadata } from "next"
import { i18n, type Locale } from "@/i18n/config"

export function getSiteBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL || process.env.CUSTOM_DOMAIN
  if (!configured) return "http://localhost:3000"
  return (/^https?:\/\//i.test(configured) ? configured : `https://${configured}`).replace(/\/+$/, "")
}

// Only the English homepage is served without a locale prefix. Other pages
// use prefixed URLs, matching middleware and the Cloudflare static router.
export function getPageAlternates(locale: Locale, path = ""): NonNullable<Metadata["alternates"]> {
  const baseUrl = getSiteBaseUrl()
  const pageUrl = (language: Locale) =>
    path === "" && language === i18n.defaultLocale ? baseUrl : `${baseUrl}/${language}${path}`
  return {
    canonical: pageUrl(locale),
    languages: Object.fromEntries(i18n.locales.map(language => [language, pageUrl(language)])),
  }
}
