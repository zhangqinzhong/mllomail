import { auth, getUserRole } from "@/lib/auth"
import { createDb } from "@/lib/db"
import { emails, messages } from "@/lib/schema"
import { ROLES } from "@/lib/permissions"
import { and, eq } from "drizzle-orm"

export const runtime = "edge"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "未登录" }, { status: 401 })
  }
  if (await getUserRole(session.user.id) !== ROLES.EMPEROR) {
    return Response.json({ error: "仅皇帝可以查看邮件正文" }, { status: 403 })
  }

  const { id, messageId } = await params
  const db = createDb()
  const [message] = await db.select({
    id: messages.id,
    emailId: messages.emailId,
    subject: messages.subject,
    fromAddress: messages.fromAddress,
    toAddress: messages.toAddress,
    type: messages.type,
    receivedAt: messages.receivedAt,
    sentAt: messages.sentAt,
    content: messages.content,
    html: messages.html,
  })
    .from(messages)
    .innerJoin(emails, eq(messages.emailId, emails.id))
    .where(and(eq(messages.id, messageId), eq(emails.userId, id)))
    .limit(1)

  if (!message) {
    return Response.json({ error: "邮件不存在" }, { status: 404 })
  }

  return Response.json({ message })
}
