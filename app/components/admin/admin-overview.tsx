"use client"

import Link from "next/link"
import { useEffect, useState, type ComponentType } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  Crown,
  Loader2,
  Mail,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import type { Role } from "@/lib/permissions"

type OverviewResponse = {
  stats: {
    totalUsers: number
    activeMailboxes: number
    roleCounts: Record<Role, number>
  }
  defaults: {
    maxEmails: number
    dailySendLimits: Record<Role, number>
  }
  error?: string
}

export function AdminOverview() {
  const t = useTranslations("admin")
  const locale = useLocale()
  const { toast } = useToast()
  const [data, setData] = useState<OverviewResponse | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/users", { cache: "no-store" })
        const payload = await response.json() as OverviewResponse
        if (!response.ok) throw new Error(payload.error || t("messages.loadFailed"))
        setData(payload)
      } catch (error) {
        toast({
          title: t("messages.loadFailed"),
          description: error instanceof Error ? error.message : t("messages.loadFailed"),
          variant: "destructive",
        })
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatLimit = (limit: number | undefined) => {
    if (limit === undefined) return "—"
    if (limit === 0) return t("limits.unlimited")
    if (limit === -1) return t("limits.disabled")
    return t("limits.perDay", { count: limit })
  }

  if (!data) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        {t("loading")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-background to-violet-500/10 p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-600 dark:text-amber-300">
            <Crown className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("overview.description")}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label={t("stats.totalUsers")} value={data.stats.totalUsers} />
        <Metric icon={Mail} label={t("stats.activeMailboxes")} value={data.stats.activeMailboxes} />
        <Metric icon={ShieldCheck} label={t("stats.privilegedUsers")} value={
          data.stats.roleCounts.duke + data.stats.roleCounts.knight
        } />
        <Metric icon={Crown} label={t("stats.emperors")} value={data.stats.roleCounts.emperor} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="rounded-2xl border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>{t("overview.defaultsTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("overview.defaultsDescription")}</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <DefaultValue label={t("config.globalMailboxLimit")} value={String(data.defaults.maxEmails)} />
            <DefaultValue label={t("config.dukeDailyLimit")} value={formatLimit(data.defaults.dailySendLimits.duke)} />
            <DefaultValue label={t("config.knightDailyLimit")} value={formatLimit(data.defaults.dailySendLimits.knight)} />
            <DefaultValue label={t("config.civilianDailyLimit")} value={formatLimit(data.defaults.dailySendLimits.civilian)} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>{t("overview.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild size="lg" className="w-full justify-start gap-3">
              <Link href={`/${locale}/admin/users`}>
                <Users className="h-5 w-5" />
                {t("overview.manageUsers")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full justify-start gap-3">
              <Link href={`/${locale}/admin/settings`}>
                <Settings className="h-5 w-5" />
                {t("overview.manageSettings")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <Card className="rounded-2xl border-primary/10 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DefaultValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  )
}
