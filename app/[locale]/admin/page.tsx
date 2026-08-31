import { Header } from "@/components/layout/header"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { auth, getUserRole } from "@/lib/auth"
import { ROLES } from "@/lib/permissions"
import { redirect } from "next/navigation"
import type { Locale } from "@/i18n/config"

export const runtime = "edge"

export default async function AdminPage({
  params,
}: {
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto max-w-[1600px] px-4 lg:px-8">
        <Header />
        <main className="pb-10 pt-24">
          <AdminDashboard />
        </main>
      </div>
    </div>
  )
}
