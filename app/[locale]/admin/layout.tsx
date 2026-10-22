import type { ReactNode } from "react"
import { Header } from "@/components/layout/header"
import { AdminNavigation } from "@/components/admin/admin-navigation"
import { SessionGate } from "@/components/pages/session-gate"



export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SessionGate admin><div className="min-h-screen bg-muted/20">
      <div className="container mx-auto max-w-[1500px] px-4 lg:px-8">
        <Header />
        <main className="pb-12 pt-24">
          <AdminNavigation />
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div></SessionGate>
  )
}
