"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, type ComponentType } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowLeft,
  Crown,
  Inbox,
  Loader2,
  Mail,
  MailCheck,
  MailX,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import type { Role } from "@/lib/permissions"

type UserDetailResponse = {
  user: {
    id: string
    name: string | null
    username: string | null
    email: string | null
    image: string | null
    role: Role
    providers: string[]
  }
  quotas: {
    maxEmails: { override: number | null; effective: number | null }
    dailySendLimit: { override: number | null; effective: number }
  }
  stats: {
    totalMailboxes: number
    activeMailboxes: number
    expiredMailboxes: number
    totalMessages: number
  }
  mailboxes: Array<{
    id: string
    address: string
    createdAt: string
    expiresAt: string
    active: boolean
    messages: { total: number; received: number; sent: number }
  }>
  error?: string
}

export function AdminUserDetail({ userId }: { userId: string }) {
  const t = useTranslations("admin")
  const locale = useLocale()
  const { toast } = useToast()
  const [data, setData] = useState<UserDetailResponse | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" })
        const payload = await response.json() as UserDetailResponse
        if (!response.ok) throw new Error(payload.error || t("messages.loadFailed"))
        setData(payload)
      } catch (error) {
        toast({
          title: t("userDetail.loadFailed"),
          description: error instanceof Error ? error.message : t("userDetail.loadFailed"),
          variant: "destructive",
        })
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))

  const formatLimit = (value: number | null) => {
    if (value === null || value === 0) return t("limits.unlimited")
    if (value === -1) return t("limits.disabled")
    return String(value)
  }

  if (!data) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        {t("loading")}
      </div>
    )
  }

  const displayName = data.user.name || data.user.username || data.user.email || data.user.id

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="gap-2">
        <Link href={`/${locale}/admin/users`}>
          <ArrowLeft className="h-4 w-4" />
          {t("userDetail.back")}
        </Link>
      </Button>

      <Card className="rounded-2xl border-primary/10 shadow-sm">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          {data.user.image ? (
            <Image src={data.user.image} alt={displayName} width={72} height={72} className="rounded-2xl ring-1 ring-border" />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="h-8 w-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold">{displayName}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {data.user.role === "emperor" && <Crown className="h-3.5 w-3.5" />}
                {t(`roles.${data.user.role}`)}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{data.user.email || data.user.username || data.user.id}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.user.providers.map((provider) => (
                <span key={provider} className="rounded-md border bg-muted/30 px-2 py-1 text-xs uppercase text-muted-foreground">
                  {provider}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Mail} label={t("userDetail.stats.totalMailboxes")} value={data.stats.totalMailboxes} />
        <Metric icon={MailCheck} label={t("userDetail.stats.activeMailboxes")} value={data.stats.activeMailboxes} />
        <Metric icon={MailX} label={t("userDetail.stats.expiredMailboxes")} value={data.stats.expiredMailboxes} />
        <Metric icon={Inbox} label={t("userDetail.stats.totalMessages")} value={data.stats.totalMessages} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <QuotaCard
          label={t("users.maxEmails")}
          effective={formatLimit(data.quotas.maxEmails.effective)}
          source={data.quotas.maxEmails.override === null ? t("userDetail.inherited") : t("userDetail.custom")}
        />
        <QuotaCard
          label={t("users.dailySendLimit")}
          effective={formatLimit(data.quotas.dailySendLimit.effective)}
          source={data.quotas.dailySendLimit.override === null ? t("userDetail.inherited") : t("userDetail.custom")}
        />
      </div>

      <Card className="rounded-2xl border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>{t("userDetail.mailboxesTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("userDetail.mailboxesDescription")}</p>
        </CardHeader>
        <CardContent>
          {data.mailboxes.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("userDetail.noMailboxes")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3 font-medium">{t("userDetail.address")}</th>
                    <th className="px-3 py-3 font-medium">{t("userDetail.status")}</th>
                    <th className="px-3 py-3 font-medium">{t("userDetail.createdAt")}</th>
                    <th className="px-3 py-3 font-medium">{t("userDetail.expiresAt")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("userDetail.messages")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mailboxes.map((mailbox) => (
                    <tr key={mailbox.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-4 font-medium">{mailbox.address}</td>
                      <td className="px-3 py-4">
                        <span className={mailbox.active
                          ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-300"
                          : "rounded-full bg-slate-500/10 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300"
                        }>
                          {mailbox.active ? t("userDetail.active") : t("userDetail.expired")}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-muted-foreground">{formatDate(mailbox.createdAt)}</td>
                      <td className="px-3 py-4 text-muted-foreground">{formatDate(mailbox.expiresAt)}</td>
                      <td className="px-3 py-4 text-right">
                        <div className="font-medium">{mailbox.messages.total}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("userDetail.messageBreakdown", {
                            received: mailbox.messages.received,
                            sent: mailbox.messages.sent,
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <Card className="rounded-2xl border-primary/10 shadow-sm">
      <CardContent className="flex items-center gap-3 p-5">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function QuotaCard({ label, effective, source }: { label: string; effective: string; source: string }) {
  return (
    <Card className="rounded-2xl border-primary/10 shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xl font-bold">{effective}</p>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{source}</span>
        </div>
      </CardContent>
    </Card>
  )
}
