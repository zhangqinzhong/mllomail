"use client"

import Image from "next/image"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import {
  Crown,
  Gem,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sword,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { ROLES, type Role } from "@/lib/permissions"

type EditableRole = typeof ROLES.DUKE | typeof ROLES.KNIGHT | typeof ROLES.CIVILIAN

type AdminUser = {
  id: string
  name: string | null
  username: string | null
  email: string | null
  image: string | null
  role: Role
  providers: string[]
  activeMailboxes: number
  overrides: {
    maxEmails: number | null
    dailySendLimit: number | null
  }
}

type AdminResponse = {
  users: AdminUser[]
  stats: {
    totalUsers: number
    activeMailboxes: number
    roleCounts: Record<Role, number>
  }
  error?: string
}

type EditableUser = {
  role: Role
  maxEmails: string
  dailySendLimit: string
}

const ROLE_ICONS = {
  [ROLES.EMPEROR]: Crown,
  [ROLES.DUKE]: Gem,
  [ROLES.KNIGHT]: Sword,
  [ROLES.CIVILIAN]: UserRound,
}

const ROLE_STYLES = {
  [ROLES.EMPEROR]: "border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  [ROLES.DUKE]: "border-violet-400/40 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  [ROLES.KNIGHT]: "border-blue-400/40 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  [ROLES.CIVILIAN]: "border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
}

function toEditableUser(user: AdminUser): EditableUser {
  return {
    role: user.role,
    maxEmails: user.overrides.maxEmails?.toString() ?? "",
    dailySendLimit: user.overrides.dailySendLimit?.toString() ?? "",
  }
}

export function AdminDashboard() {
  const t = useTranslations("admin")
  const { toast } = useToast()
  const [data, setData] = useState<AdminResponse | null>(null)
  const [editableUsers, setEditableUsers] = useState<Record<string, EditableUser>>({})
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all")
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  const fetchUsers = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" })
      const payload = await response.json() as AdminResponse
      if (!response.ok) throw new Error(payload.error || t("messages.loadFailed"))

      setData(payload)
      setEditableUsers(Object.fromEntries(
        payload.users.map((user) => [user.id, toEditableUser(user)])
      ))
    } catch (error) {
      toast({
        title: t("messages.loadFailed"),
        description: error instanceof Error ? error.message : t("messages.loadFailed"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return (data?.users ?? []).filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter
      const matchesSearch = !normalizedSearch || [user.name, user.username, user.email]
        .some((value) => value?.toLowerCase().includes(normalizedSearch))
      return matchesRole && matchesSearch
    })
  }, [data, roleFilter, search])

  const updateEditableUser = (userId: string, patch: Partial<EditableUser>) => {
    setEditableUsers((current) => ({
      ...current,
      [userId]: { ...current[userId], ...patch },
    }))
  }

  const saveUser = async (user: AdminUser) => {
    const editable = editableUsers[user.id]
    if (!editable || user.role === ROLES.EMPEROR) return

    const parseOptionalNumber = (value: string) => {
      const normalized = value.trim()
      return normalized === "" ? null : Number(normalized)
    }

    const maxEmails = parseOptionalNumber(editable.maxEmails)
    const dailySendLimit = parseOptionalNumber(editable.dailySendLimit)

    if (maxEmails !== null && (!Number.isInteger(maxEmails) || maxEmails < 1 || maxEmails > 1000)) {
      toast({ title: t("messages.invalidMaxEmails"), variant: "destructive" })
      return
    }
    if (dailySendLimit !== null && (!Number.isInteger(dailySendLimit) || dailySendLimit < -1 || dailySendLimit > 10000)) {
      toast({ title: t("messages.invalidDailyLimit"), variant: "destructive" })
      return
    }

    setSavingUserId(user.id)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editable.role,
          maxEmails,
          dailySendLimit,
        }),
      })
      const payload = await response.json() as { success?: boolean; error?: string }
      if (!response.ok) throw new Error(payload.error || t("messages.saveFailed"))

      toast({
        title: t("messages.saveSuccess"),
        description: user.name || user.username || user.email || user.id,
      })
      await fetchUsers(false)
    } catch (error) {
      toast({
        title: t("messages.saveFailed"),
        description: error instanceof Error ? error.message : t("messages.saveFailed"),
        variant: "destructive",
      })
    } finally {
      setSavingUserId(null)
    }
  }

  const roleName = (role: Role) => t(`roles.${role}`)

  const RoleBadge = ({ role }: { role: Role }) => {
    const Icon = ROLE_ICONS[role]
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        ROLE_STYLES[role]
      )}>
        <Icon className="h-3.5 w-3.5" />
        {roleName(role)}
      </span>
    )
  }

  const RoleEditor = ({ user }: { user: AdminUser }) => {
    if (user.role === ROLES.EMPEROR) return <RoleBadge role={user.role} />
    return (
      <Select
        value={editableUsers[user.id]?.role ?? user.role}
        onValueChange={(value) => updateEditableUser(user.id, { role: value as EditableRole })}
      >
        <SelectTrigger className="h-9 min-w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ROLES.DUKE}>{roleName(ROLES.DUKE)}</SelectItem>
          <SelectItem value={ROLES.KNIGHT}>{roleName(ROLES.KNIGHT)}</SelectItem>
          <SelectItem value={ROLES.CIVILIAN}>{roleName(ROLES.CIVILIAN)}</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  const QuotaInput = ({
    user,
    field,
    placeholder,
    min,
  }: {
    user: AdminUser
    field: "maxEmails" | "dailySendLimit"
    placeholder: string
    min: number
  }) => (
    <Input
      type="number"
      min={min}
      max={field === "maxEmails" ? 1000 : 10000}
      value={editableUsers[user.id]?.[field] ?? ""}
      onChange={(event) => updateEditableUser(user.id, { [field]: event.target.value })}
      placeholder={placeholder}
      disabled={user.role === ROLES.EMPEROR}
      className="h-9 w-full min-w-24"
    />
  )

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        {t("loading")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-background to-violet-500/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-600 dark:text-amber-300">
              <Crown className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">{t("title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">{t("description")}</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => fetchUsers()}>
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label={t("stats.totalUsers")} value={data?.stats.totalUsers ?? 0} />
        <StatCard icon={Mail} label={t("stats.activeMailboxes")} value={data?.stats.activeMailboxes ?? 0} />
        <StatCard icon={ShieldCheck} label={t("stats.privilegedUsers")} value={
          (data?.stats.roleCounts.duke ?? 0) + (data?.stats.roleCounts.knight ?? 0)
        } />
        <StatCard icon={Crown} label={t("stats.emperors")} value={data?.stats.roleCounts.emperor ?? 0} />
      </div>

      <Card className="border-primary/15">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl">{t("users.title")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{t("users.description")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-60">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("users.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as Role | "all")}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.allRoles")}</SelectItem>
                {Object.values(ROLES).map((role) => (
                  <SelectItem key={role} value={role}>{roleName(role)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("users.empty")}</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-3 font-medium">{t("users.user")}</th>
                      <th className="px-3 py-3 font-medium">{t("users.role")}</th>
                      <th className="px-3 py-3 font-medium">{t("users.mailboxes")}</th>
                      <th className="px-3 py-3 font-medium">{t("users.maxEmails")}</th>
                      <th className="px-3 py-3 font-medium">{t("users.dailySendLimit")}</th>
                      <th className="px-3 py-3 text-right font-medium">{t("users.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-4"><UserIdentity user={user} /></td>
                        <td className="px-3 py-4"><RoleEditor user={user} /></td>
                        <td className="px-3 py-4 font-medium">{user.activeMailboxes}</td>
                        <td className="px-3 py-4">
                          <QuotaInput user={user} field="maxEmails" min={1} placeholder={t("users.useSiteDefault")} />
                        </td>
                        <td className="px-3 py-4">
                          <QuotaInput user={user} field="dailySendLimit" min={-1} placeholder={t("users.useRoleDefault")} />
                        </td>
                        <td className="px-3 py-4 text-right">
                          <SaveButton user={user} savingUserId={savingUserId} onSave={saveUser} label={t("users.save")} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 lg:hidden">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="space-y-4 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <UserIdentity user={user} />
                      {user.role === ROLES.EMPEROR && <RoleBadge role={user.role} />}
                    </div>
                    {user.role !== ROLES.EMPEROR && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label={t("users.role")}><RoleEditor user={user} /></Field>
                        <Field label={t("users.maxEmails")}>
                          <QuotaInput user={user} field="maxEmails" min={1} placeholder={t("users.useSiteDefault")} />
                        </Field>
                        <Field label={t("users.dailySendLimit")}>
                          <QuotaInput user={user} field="dailySendLimit" min={-1} placeholder={t("users.useRoleDefault")} />
                        </Field>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground">
                        {t("users.mailboxes")}: <strong className="text-foreground">{user.activeMailboxes}</strong>
                      </span>
                      <SaveButton user={user} savingUserId={savingUserId} onSave={saveUser} label={t("users.save")} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 rounded-lg border border-dashed p-4 text-xs leading-6 text-muted-foreground">
            <div className="flex gap-2">
              <Send className="mt-1 h-4 w-4 flex-none" />
              <p>{t("users.quotaHelp")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <Card className="border-primary/10">
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

function UserIdentity({ user }: { user: AdminUser }) {
  const displayName = user.name || user.username || user.email || user.id
  return (
    <div className="flex min-w-0 items-center gap-3">
      {user.image ? (
        <Image src={user.image} alt={displayName} width={38} height={38} className="rounded-full ring-1 ring-border" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="max-w-52 truncate font-medium">{displayName}</p>
        <p className="max-w-56 truncate text-xs text-muted-foreground">{user.email || user.username || user.id}</p>
        {user.providers.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {user.providers.map((provider) => (
              <span key={provider} className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                {provider}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function SaveButton({
  user,
  savingUserId,
  onSave,
  label,
}: {
  user: AdminUser
  savingUserId: string | null
  onSave: (user: AdminUser) => void
  label: string
}) {
  const saving = savingUserId === user.id
  return (
    <Button
      size="sm"
      className="gap-2"
      disabled={user.role === ROLES.EMPEROR || savingUserId !== null}
      onClick={() => onSave(user)}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {label}
    </Button>
  )
}
