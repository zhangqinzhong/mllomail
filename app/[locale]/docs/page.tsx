import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { ApiDocs } from "@/components/docs/api-docs"
import { auth } from "@/lib/auth"
import { ROLES } from "@/lib/permissions"
import type { Locale } from "@/i18n/config"

export const runtime = "edge"

export const metadata: Metadata = {
  title: "API Docs | MoeMail",
  robots: { index: false, follow: false },
}

export default async function ApiDocsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: localeFromParams } = await params
  const locale = localeFromParams as Locale
  const session = await auth()

  if (!session?.user) {
    redirect(`/${locale}/login`)
  }

  const requestHeaders = await headers()
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host")
  const protocol = requestHeaders.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https")
  const baseUrl = host ? `${protocol}://${host}` : "https://YOUR_DOMAIN"
  const roles = session.user.roles?.map(({ name }) => name) || []
  const canCreateApiKey = roles.includes(ROLES.EMPEROR) || roles.includes(ROLES.DUKE)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <Header />
      <ApiDocs
        baseUrl={baseUrl}
        canCreateApiKey={canCreateApiKey}
        locale={locale}
      />
    </div>
  )
}
