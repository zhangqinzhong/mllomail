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
  MessageSquareText,
  UserRound,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Role } from "@/lib/permissions"

type MailboxMessage = {
  id: string
  subject: string
  fromAddress: string | null
  toAddress: string | null
  type: string | null
  receivedAt: string
  sentAt: string
}

type MessageDetail = MailboxMessage & {
  emailId: string
  content: string
  html: string | null
}

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
  const [activeMailbox, setActiveMailbox] = useState<{ id: string; address: string } | null>(null)
  const [mailboxMessages, setMailboxMessages] = useState<MailboxMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)
  const [messageLoading, setMessageLoading] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null)

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

  const openMailboxMessages = async (mailbox: { id: string; address: string }) => {
    setActiveMailbox(mailbox)
    setMailboxMessages([])
    setMessagesLoading(true)
    try {
      const response = await fetch(
        `/api/admin/users/${userId}/messages?emailId=${encodeURIComponent(mailbox.id)}`,
        { cache: "no-store" }
      )
      const payload = await response.json() as { messages?: MailboxMessage[]; error?: string }
      if (!response.ok) throw new Error(payload.error || t("userDetail.messagesLoadFailed"))
      setMailboxMessages(payload.messages ?? [])
    } catch (error) {
      toast({
        title: t("userDetail.messagesLoadFailed"),
        description: error instanceof Error ? error.message : t("userDetail.messagesLoadFailed"),
        variant: "destructive",
      })
    } finally {
      setMessagesLoading(false)
    }
  }

  const openMessage = async (messageId: string) => {
    setSelectedMessage(null)
    setMessageDialogOpen(true)
    setMessageLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/messages/${messageId}`, { cache: "no-store" })
      const payload = await response.json() as { message?: MessageDetail; error?: string }
      if (!response.ok || !payload.message) {
        throw new Error(payload.error || t("userDetail.messageLoadFailed"))
      }
      setSelectedMessage(payload.message)
    } catch (error) {
      toast({
        title: t("userDetail.messageLoadFailed"),
        description: error instanceof Error ? error.message : t("userDetail.messageLoadFailed"),
        variant: "destructive",
      })
      setMessageDialogOpen(false)
    } finally {
      setMessageLoading(false)
    }
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
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3 font-medium">{t("userDetail.address")}</th>
                    <th className="px-3 py-3 font-medium">{t("userDetail.status")}</th>
                    <th className="px-3 py-3 font-medium">{t("userDetail.createdAt")}</th>
                    <th className="px-3 py-3 font-medium">{t("userDetail.expiresAt")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("userDetail.messages")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("users.actions")}</th>
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
                      <td className="px-3 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => openMailboxMessages({ id: mailbox.id, address: mailbox.address })}
                        >
                          <MessageSquareText className="h-4 w-4" />
                          {t("userDetail.viewMessages")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              {activeMailbox && (
                <div className="mt-6 overflow-hidden rounded-2xl border">
                  <div className="flex items-center justify-between gap-3 border-b bg-muted/20 p-4">
                    <div>
                      <p className="font-semibold">{activeMailbox.address}</p>
                      <p className="text-xs text-muted-foreground">{t("userDetail.messageListDescription")}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("userDetail.closeMessages")}
                      onClick={() => {
                        setActiveMailbox(null)
                        setMailboxMessages([])
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t("userDetail.loadingMessages")}
                    </div>
                  ) : mailboxMessages.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">{t("userDetail.noMessages")}</div>
                  ) : (
                    <div className="divide-y">
                      {mailboxMessages.map((message) => (
                        <button
                          key={message.id}
                          type="button"
                          onClick={() => openMessage(message.id)}
                          className="flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/30"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{message.subject}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {message.type === "sent"
                                ? `${t("userDetail.to")}: ${message.toAddress || "—"}`
                                : `${t("userDetail.from")}: ${message.fromAddress || "—"}`}
                            </p>
                          </div>
                          <div className="flex-none text-right">
                            <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                              {message.type === "sent" ? t("userDetail.sent") : t("userDetail.received")}
                            </span>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {formatDate(message.type === "sent" ? message.sentAt : message.receivedAt)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          {messageLoading || !selectedMessage ? (
            <div className="flex min-h-60 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              {t("userDetail.loadingMessage")}
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8 text-xl leading-7">{selectedMessage.subject}</DialogTitle>
                <DialogDescription className="space-y-1 pt-2 text-left">
                  <span className="block">{t("userDetail.from")}: {selectedMessage.fromAddress || "—"}</span>
                  <span className="block">{t("userDetail.to")}: {selectedMessage.toAddress || "—"}</span>
                  <span className="block">
                    {t("userDetail.time")}: {formatDate(
                      selectedMessage.type === "sent" ? selectedMessage.sentAt : selectedMessage.receivedAt
                    )}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue={selectedMessage.html ? "html" : "text"}>
                <TabsList>
                  {selectedMessage.html && <TabsTrigger value="html">{t("userDetail.htmlBody")}</TabsTrigger>}
                  <TabsTrigger value="text">{t("userDetail.textBody")}</TabsTrigger>
                </TabsList>
                {selectedMessage.html && (
                  <TabsContent value="html" className="mt-4">
                    <iframe
                      title={selectedMessage.subject}
                      sandbox=""
                      referrerPolicy="no-referrer"
                      srcDoc={selectedMessage.html}
                      className="h-[55vh] w-full rounded-xl border bg-white"
                    />
                  </TabsContent>
                )}
                <TabsContent value="text" className="mt-4">
                  <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-muted/20 p-4 font-sans text-sm leading-6">
                    {selectedMessage.content || t("userDetail.emptyBody")}
                  </pre>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
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
