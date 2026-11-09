import { Env } from '../types'
import { drizzle } from 'drizzle-orm/d1'
import { messages, emails, webhooks } from '../app/lib/schema'
import { eq, sql } from 'drizzle-orm'
import PostalMime from 'postal-mime'
import { WEBHOOK_CONFIG } from '../app/config/webhook'
import { callWebhook, EmailMessage } from '../app/lib/webhook'

const handleEmail = async (message: ForwardableEmailMessage, env: Env) => {
  const db = drizzle(env.DB, { schema: { messages, emails, webhooks } })

  const parsedMessage = await PostalMime.parse(message.raw)

  // Log fixed events only. Mail fields and raw errors can contain private data.
  try {
    const targetEmail = await db.query.emails.findFirst({
      where: eq(sql`LOWER(${emails.address})`, message.to.toLowerCase())
    })

    if (!targetEmail) {
      console.error('Email not found')
      return
    }

    const savedMessage = await db.insert(messages).values({
      emailId: targetEmail.id,
      fromAddress: message.from,
      subject: parsedMessage.subject || '(无主题)',
      content: parsedMessage.text || '',
      html: parsedMessage.html || '',
      type: 'received',
    }).returning().get()

    const webhook = await db.query.webhooks.findFirst({
      where: eq(webhooks.userId, targetEmail!.userId!)
    })

    if (webhook?.enabled) {
      try {
        await callWebhook(webhook.url, {
          event: WEBHOOK_CONFIG.EVENTS.NEW_MESSAGE,
          data: {
            emailId: targetEmail.id,
            messageId: savedMessage.id,
            fromAddress: savedMessage.fromAddress,
            subject: savedMessage.subject,
            content: savedMessage.content,
            html: savedMessage.html,
            receivedAt: savedMessage.receivedAt.toISOString(),
            toAddress: targetEmail.address
          } as EmailMessage
        })
      } catch {
        console.error('Failed to send webhook')
      }
    }

    console.log('Email processed')
  } catch {
    console.error('Failed to process email')
  }
}

const worker = {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    try {
      await handleEmail(message, env)
    } catch {
      // Preserve initialization/parse failures without exposing the original
      // error (or its cause) in the runtime's unhandled-exception logs.
      throw new Error('Failed to initialize or parse email')
    }
  }
}

export default worker 
