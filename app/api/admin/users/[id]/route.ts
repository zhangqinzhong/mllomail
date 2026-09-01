import { auth, assignRoleToUser, getUserRole } from "@/lib/auth"
import { createDb } from "@/lib/db"
import { roles, users } from "@/lib/schema"
import { ROLES, type Role } from "@/lib/permissions"
import { eq } from "drizzle-orm"
import { getRequestContext } from "@cloudflare/next-on-pages"

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
