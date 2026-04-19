import { WEBHOOK_CONFIG } from "@/config"

export interface EmailMessage {
  emailId: string
  messageId: string
  fromAddress: string
  subject: string
  content: string
  html: string
  receivedAt: string
  toAddress: string
}

export interface WebhookPayload {
  event: typeof WEBHOOK_CONFIG.EVENTS[keyof typeof WEBHOOK_CONFIG.EVENTS]
  data: EmailMessage
}

const DISALLOWED_WEBHOOK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
])

export function validateWebhookUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl)

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Webhook URL must use HTTP or HTTPS")
  }

  const hostname = parsed.hostname.toLowerCase()
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "")

  if (
    DISALLOWED_WEBHOOK_HOSTS.has(normalizedHostname) ||
    normalizedHostname.endsWith(".local") ||
    normalizedHostname.endsWith(".internal")
  ) {
    throw new Error("Webhook URL points to a disallowed host")
  }

  if (
    /^10\./.test(normalizedHostname) ||
    /^127\./.test(normalizedHostname) ||
    /^169\.254\./.test(normalizedHostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalizedHostname) ||
    /^192\.168\./.test(normalizedHostname)
  ) {
    throw new Error("Webhook URL points to a private network")
  }

  return parsed.toString()
}

export async function callWebhook(url: string, payload: WebhookPayload) {
  const validatedUrl = validateWebhookUrl(url)
  let lastError: Error | null = null
  
  for (let i = 0; i < WEBHOOK_CONFIG.MAX_RETRIES; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.TIMEOUT)

      const response = await fetch(validatedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": payload.event,
        },
        body: JSON.stringify(payload.data),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return true
      }

      lastError = new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
      lastError = error as Error
      
      if (i < WEBHOOK_CONFIG.MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, WEBHOOK_CONFIG.RETRY_DELAY))
      }
    }
  }

  throw lastError
} 
