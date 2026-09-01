import { auth, getUserRole } from "@/lib/auth"
import { createDb } from "@/lib/db"
import { emails, messages } from "@/lib/schema"
import { ROLES } from "@/lib/permissions"
import { and, desc, eq } from "drizzle-orm"

export const runtime = "edge"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "未登录" }, { status: 401 })
  }
  if (await getUserRole(session.user.id) !== ROLES.EMPEROR) {
    return Response.json({ error: "仅皇帝可以查看用户邮件" }, { status: 403 })
  }

  const { id } = await params
  const emailId = new URL(request.url).searchParams.get("emailId")
  if (!emailId) {
    return Response.json({ error: "缺少邮箱 ID" }, { status: 400 })
  }

  const db = createDb()
  const mailbox = await db.query.emails.findFirst({
    where: and(eq(emails.id, emailId), eq(emails.userId, id)),
  })
  if (!mailbox) {
    return Response.json({ error: "邮箱不存在" }, { status: 404 })
  }

  const result = await db.select({
    id: messages.id,
    subject: messages.subject,
    fromAddress: messages.fromAddress,
    toAddress: messages.toAddress,
    type: messages.type,
    receivedAt: messages.receivedAt,
    sentAt: messages.sentAt,
  })
    .from(messages)
    .where(eq(messages.emailId, emailId))
    .orderBy(desc(messages.receivedAt))
    .limit(200)

  return Response.json({ mailbox: mailbox.address, messages: result })
}
