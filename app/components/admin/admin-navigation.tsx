"use client"

import Link from "next/link"
import { Crown, Settings, Users } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function AdminNavigation() {
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations("admin.nav")
  const items = [
    { href: `/${locale}/admin`, label: t("overview"), icon: Crown, exact: true },
    { href: `/${locale}/admin/users`, label: t("users"), icon: Users },
    { href: `/${locale}/admin/settings`, label: t("settings"), icon: Settings },
  ]

  return (
    <nav className="grid grid-cols-3 gap-2 rounded-2xl border bg-background p-2 shadow-sm">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
