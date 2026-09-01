import { auth, getUserRole } from "@/lib/auth"
import { createDb } from "@/lib/db"
import { accounts, emails, roles, userRoles, users } from "@/lib/schema"
import { ROLES, type Role } from "@/lib/permissions"
import { and, eq, gt, isNotNull, sql } from "drizzle-orm"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { EMAIL_CONFIG } from "@/config"

export const runtime = "edge"

const ROLE_ORDER: Record<Role, number> = {
  [ROLES.EMPEROR]: 0,
  [ROLES.DUKE]: 1,
  [ROLES.KNIGHT]: 2,
  [ROLES.CIVILIAN]: 3,
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "未登录" }, { status: 401 })
  }

  if (await getUserRole(session.user.id) !== ROLES.EMPEROR) {
    return Response.json({ error: "仅皇帝可以访问后台" }, { status: 403 })
  }

  const db = createDb()
  const env = getRequestContext().env
  const now = new Date()

  const [
    userRows,
    roleRows,
    accountRows,
    mailboxRows,
    configuredMaxEmails,
    configuredRoleLimits,
  ] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      image: users.image,
    }).from(users),
    db.select({
      userId: userRoles.userId,
      roleName: roles.name,
    }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)),
    db.select({
      userId: accounts.userId,
      provider: accounts.provider,
    }).from(accounts),
    db.select({
      userId: emails.userId,
      count: sql<number>`count(*)`,
    })
      .from(emails)
      .where(and(isNotNull(emails.userId), gt(emails.expiresAt, now)))
      .groupBy(emails.userId),
    env.SITE_CONFIG.get("MAX_EMAILS"),
    env.SITE_CONFIG.get("EMAIL_ROLE_LIMITS"),
  ])

  const parsedMaxEmails = Number(configuredMaxEmails)
  const maxEmails = Number.isInteger(parsedMaxEmails) && parsedMaxEmails > 0
    ? parsedMaxEmails
    : EMAIL_CONFIG.MAX_ACTIVE_EMAILS

  let roleLimits: { duke?: number; knight?: number } = {}
  try {
    roleLimits = configuredRoleLimits ? JSON.parse(configuredRoleLimits) : {}
  } catch {
    roleLimits = {}
  }

  const dailySendLimits: Record<Role, number> = {
    [ROLES.EMPEROR]: EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.emperor,
    [ROLES.DUKE]: Number.isInteger(roleLimits.duke)
      ? roleLimits.duke!
      : EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.duke,
    [ROLES.KNIGHT]: Number.isInteger(roleLimits.knight)
      ? roleLimits.knight!
      : EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.knight,
    [ROLES.CIVILIAN]: EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.civilian,
  }

  const roleByUser = new Map<string, Role>()
  for (const row of roleRows) {
    roleByUser.set(row.userId, row.roleName as Role)
  }

  const providersByUser = new Map<string, Set<string>>()
  for (const row of accountRows) {
    const providers = providersByUser.get(row.userId) ?? new Set<string>()
    providers.add(row.provider)
    providersByUser.set(row.userId, providers)
  }

  const mailboxCountByUser = new Map<string, number>()
  for (const row of mailboxRows) {
    if (row.userId) mailboxCountByUser.set(row.userId, Number(row.count))
  }

  const result = await Promise.all(userRows.map(async (user) => {
    const [maxEmails, dailySendLimit] = await Promise.all([
      env.SITE_CONFIG.get(`USER_MAX_EMAILS:${user.id}`),
      env.SITE_CONFIG.get(`USER_DAILY_SEND_LIMIT:${user.id}`),
    ])

    return {
      ...user,
      role: roleByUser.get(user.id) ?? ROLES.CIVILIAN,
      providers: Array.from(providersByUser.get(user.id) ?? []),
      activeMailboxes: mailboxCountByUser.get(user.id) ?? 0,
      overrides: {
        maxEmails: maxEmails === null ? null : Number(maxEmails),
        dailySendLimit: dailySendLimit === null ? null : Number(dailySendLimit),
      },
    }
  }))

  result.sort((a, b) => {
    const roleDifference = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
    if (roleDifference !== 0) return roleDifference
    return (a.name || a.username || a.email || "").localeCompare(
      b.name || b.username || b.email || ""
    )
  })

  const roleCounts = Object.values(ROLES).reduce<Record<Role, number>>((counts, role) => {
    counts[role] = result.filter((user) => user.role === role).length
    return counts
  }, {
    [ROLES.EMPEROR]: 0,
    [ROLES.DUKE]: 0,
    [ROLES.KNIGHT]: 0,
    [ROLES.CIVILIAN]: 0,
  })

  return Response.json({
    users: result,
    defaults: {
      maxEmails,
      dailySendLimits,
    },
    stats: {
      totalUsers: result.length,
      activeMailboxes: result.reduce((total, user) => total + user.activeMailboxes, 0),
      roleCounts,
    },
  })
}
