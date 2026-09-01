import type { ReactNode } from "react"
import { Header } from "@/components/layout/header"
import { AdminNavigation } from "@/components/admin/admin-navigation"
import { auth, getUserRole } from "@/lib/auth"
import { ROLES } from "@/lib/permissions"
import { redirect } from "next/navigation"
import type { Locale } from "@/i18n/config"

export const runtime = "edge"

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: localeFromParams } = await params
  const locale = localeFromParams as Locale
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/${locale}/login`)
  }

  if (await getUserRole(session.user.id) !== ROLES.EMPEROR) {
    redirect(`/${locale}/profile`)
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto max-w-[1500px] px-4 lg:px-8">
        <Header />
        <main className="pb-12 pt-24">
          <AdminNavigation />
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
