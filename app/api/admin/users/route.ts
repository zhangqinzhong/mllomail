import { auth } from "@/lib/auth"
import { ROLES, type Role } from "@/lib/permissions"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { EMAIL_CONFIG } from "@/config"
import { readKvValues } from "@/lib/kv-read"

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

  if (session.user.roles?.[0]?.name !== ROLES.EMPEROR) {
    return Response.json({ error: "仅皇帝可以访问后台" }, { status: 403 })
  }

  const env = getRequestContext().env
  // Keep authorization fresh through auth(); batch metadata reads to avoid ORM
  // query construction and one network/decoding operation per table.
  const [tables, settings] = await Promise.all([
    env.DB.batch([
      env.DB.prepare('SELECT id, name, username, email, image FROM user'),
      env.DB.prepare('SELECT ur.user_id AS userId, r.name AS roleName FROM user_role ur JOIN role r ON r.id = ur.role_id'),
      env.DB.prepare('SELECT userId, provider FROM account'),
      env.DB.prepare('SELECT userId, count(*) AS count FROM email WHERE userId IS NOT NULL AND expires_at > ? GROUP BY userId').bind(Date.now()),
    ]),
    readKvValues(env.SITE_CONFIG, ["MAX_EMAILS", "EMAIL_ROLE_LIMITS"]),
  ])
  const userRows = tables[0].results as {id:string;name:string|null;username:string|null;email:string|null;image:string|null}[]
  const roleRows = tables[1].results as {userId:string;roleName:Role}[]
  const accountRows = tables[2].results as {userId:string;provider:string}[]
  const mailboxRows = tables[3].results as {userId:string;count:number}[]
  const [configuredMaxEmails, configuredRoleLimits] = settings

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

  const overrideKeys = userRows.flatMap(user => [
    `USER_MAX_EMAILS:${user.id}`, `USER_DAILY_SEND_LIMIT:${user.id}`,
  ])
  const overrides = await readKvValues(env.SITE_CONFIG, overrideKeys)
  const result = userRows.map((user, index) => {
    const maxEmails = overrides[index * 2]
    const dailySendLimit = overrides[index * 2 + 1]
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
  })

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
