import { auth, assignRoleToUser, getUserRole } from "@/lib/auth"
import { createDb } from "@/lib/db"
import { accounts, emails, messages, roles, users } from "@/lib/schema"
import { ROLES, type Role } from "@/lib/permissions"
import { desc, eq, sql } from "drizzle-orm"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { EMAIL_CONFIG } from "@/config"

export const runtime = "edge"

type EditableRole = typeof ROLES.DUKE | typeof ROLES.KNIGHT | typeof ROLES.CIVILIAN

interface UpdateUserRequest {
  role?: Role
  maxEmails?: number | null
  dailySendLimit?: number | null
}

const EDITABLE_ROLES: EditableRole[] = [ROLES.DUKE, ROLES.KNIGHT, ROLES.CIVILIAN]

function isIntegerInRange(value: number | null | undefined, minimum: number, maximum: number) {
  return value === null || value === undefined || (
    Number.isInteger(value) && value >= minimum && value <= maximum
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "未登录" }, { status: 401 })
  }

  if (await getUserRole(session.user.id) !== ROLES.EMPEROR) {
    return Response.json({ error: "仅皇帝可以查看用户详情" }, { status: 403 })
  }

  const { id } = await params
  const db = createDb()
  const env = getRequestContext().env

  const [user, accountRows, mailboxRows, messageCountRows, role, maxEmailsOverride, dailyLimitOverride, configuredMaxEmails, configuredRoleLimits] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, id) }),
    db.select({ provider: accounts.provider }).from(accounts).where(eq(accounts.userId, id)),
    db.select({
      id: emails.id,
      address: emails.address,
      createdAt: emails.createdAt,
      expiresAt: emails.expiresAt,
    }).from(emails).where(eq(emails.userId, id)).orderBy(desc(emails.createdAt)),
    db.select({
      emailId: messages.emailId,
      total: sql<number>`count(*)`,
      received: sql<number>`sum(case when ${messages.type} = 'received' then 1 else 0 end)`,
      sent: sql<number>`sum(case when ${messages.type} = 'sent' then 1 else 0 end)`,
    })
      .from(messages)
      .innerJoin(emails, eq(messages.emailId, emails.id))
      .where(eq(emails.userId, id))
      .groupBy(messages.emailId),
    getUserRole(id),
    env.SITE_CONFIG.get(`USER_MAX_EMAILS:${id}`),
    env.SITE_CONFIG.get(`USER_DAILY_SEND_LIMIT:${id}`),
    env.SITE_CONFIG.get("MAX_EMAILS"),
    env.SITE_CONFIG.get("EMAIL_ROLE_LIMITS"),
  ])

  if (!user) {
    return Response.json({ error: "用户不存在" }, { status: 404 })
  }

  const userRole = role ?? ROLES.CIVILIAN
  const parsedMaxEmails = Number(configuredMaxEmails)
  const defaultMaxEmails = Number.isInteger(parsedMaxEmails) && parsedMaxEmails > 0
    ? parsedMaxEmails
    : EMAIL_CONFIG.MAX_ACTIVE_EMAILS

  let customRoleLimits: { duke?: number; knight?: number } = {}
  try {
    customRoleLimits = configuredRoleLimits ? JSON.parse(configuredRoleLimits) : {}
  } catch {
    customRoleLimits = {}
  }

  const roleDailyLimits: Record<Role, number> = {
    [ROLES.EMPEROR]: EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.emperor,
    [ROLES.DUKE]: Number.isInteger(customRoleLimits.duke)
      ? customRoleLimits.duke!
      : EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.duke,
    [ROLES.KNIGHT]: Number.isInteger(customRoleLimits.knight)
      ? customRoleLimits.knight!
      : EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.knight,
    [ROLES.CIVILIAN]: EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.civilian,
  }

  const parsedMaxOverride = maxEmailsOverride === null ? null : Number(maxEmailsOverride)
  const parsedDailyOverride = dailyLimitOverride === null ? null : Number(dailyLimitOverride)
  const messageCounts = new Map(messageCountRows.map((row) => [row.emailId, {
    total: Number(row.total),
    received: Number(row.received),
    sent: Number(row.sent),
  }]))
  const now = Date.now()
  const mailboxes = mailboxRows.map((mailbox) => ({
    ...mailbox,
    active: mailbox.expiresAt.getTime() > now,
    messages: messageCounts.get(mailbox.id) ?? { total: 0, received: 0, sent: 0 },
  }))

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
      role: userRole,
      providers: Array.from(new Set(accountRows.map((account) => account.provider))),
    },
    quotas: {
      maxEmails: {
        override: parsedMaxOverride,
        effective: userRole === ROLES.EMPEROR ? null : (parsedMaxOverride ?? defaultMaxEmails),
      },
      dailySendLimit: {
        override: parsedDailyOverride,
        effective: parsedDailyOverride ?? roleDailyLimits[userRole],
      },
    },
    stats: {
      totalMailboxes: mailboxes.length,
      activeMailboxes: mailboxes.filter((mailbox) => mailbox.active).length,
      expiredMailboxes: mailboxes.filter((mailbox) => !mailbox.active).length,
      totalMessages: mailboxes.reduce((total, mailbox) => total + mailbox.messages.total, 0),
    },
    mailboxes,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "未登录" }, { status: 401 })
  }

  if (await getUserRole(session.user.id) !== ROLES.EMPEROR) {
    return Response.json({ error: "仅皇帝可以修改用户" }, { status: 403 })
  }

  const { id } = await params
  const payload = await request.json() as UpdateUserRequest
  const db = createDb()

  const targetUser = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!targetUser) {
    return Response.json({ error: "用户不存在" }, { status: 404 })
  }

  const targetRole = await getUserRole(id)
  if (payload.role !== undefined && payload.role !== ROLES.EMPEROR && !EDITABLE_ROLES.includes(payload.role)) {
    return Response.json({ error: "角色不合法" }, { status: 400 })
  }

  if (targetRole === ROLES.EMPEROR && payload.role !== undefined && payload.role !== ROLES.EMPEROR) {
    return Response.json({ error: "皇帝账号不能在后台降级" }, { status: 400 })
  }

  if (targetRole !== ROLES.EMPEROR && payload.role === ROLES.EMPEROR) {
    return Response.json({ error: "不能通过用户面板授予皇帝身份" }, { status: 400 })
  }

  if (!isIntegerInRange(payload.maxEmails, 1, 1000)) {
    return Response.json({ error: "邮箱数量限制必须是 1 到 1000 的整数" }, { status: 400 })
  }

  if (!isIntegerInRange(payload.dailySendLimit, -1, 10000)) {
    return Response.json({ error: "每日发件限制必须是 -1 到 10000 的整数" }, { status: 400 })
  }

  if (payload.role !== undefined && payload.role !== ROLES.EMPEROR && payload.role !== targetRole) {
    let role = await db.query.roles.findFirst({ where: eq(roles.name, payload.role) })
    if (!role) {
      const descriptions: Record<EditableRole, string> = {
        [ROLES.DUKE]: "公爵（超级用户）",
        [ROLES.KNIGHT]: "骑士（高级用户）",
        [ROLES.CIVILIAN]: "平民（普通用户）",
      }
      const [createdRole] = await db.insert(roles).values({
        name: payload.role as Role,
        description: descriptions[payload.role],
      }).returning()
      role = createdRole
    }
    await assignRoleToUser(db, id, role.id)
  }

  const env = getRequestContext().env
  const updates: Promise<void>[] = []

  if (payload.maxEmails !== undefined) {
    updates.push(payload.maxEmails === null
      ? env.SITE_CONFIG.delete(`USER_MAX_EMAILS:${id}`)
      : env.SITE_CONFIG.put(`USER_MAX_EMAILS:${id}`, payload.maxEmails.toString()))
  }

  if (payload.dailySendLimit !== undefined) {
    updates.push(payload.dailySendLimit === null
      ? env.SITE_CONFIG.delete(`USER_DAILY_SEND_LIMIT:${id}`)
      : env.SITE_CONFIG.put(`USER_DAILY_SEND_LIMIT:${id}`, payload.dailySendLimit.toString()))
  }

  await Promise.all(updates)
  return Response.json({ success: true })
}
