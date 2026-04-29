import { PERMISSIONS, Role, ROLES } from "@/lib/permissions"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { EMAIL_CONFIG } from "@/config"
import { checkPermission } from "@/lib/auth"

export const runtime = "edge"

interface SiteConfigRequest {
  defaultRole: Exclude<Role, typeof ROLES.EMPEROR>
  emailDomains: string
  adminContact: string
  maxEmails: string
  sourceLink?: {
    enabled: boolean
    url: string
    label: string
  }
  turnstile?: {
    enabled: boolean
    siteKey: string
    secretKey?: string
    preserveExistingSecretKey?: boolean
  }
}

export async function GET() {
  const env = getRequestContext().env
  const canManageConfig = await checkPermission(PERMISSIONS.MANAGE_CONFIG)

  const [
    defaultRole,
    emailDomains,
    adminContact,
    maxEmails,
    turnstileEnabled,
    turnstileSiteKey,
    turnstileSecretKey,
    sourceLinkEnabled,
    sourceLinkUrl,
    sourceLinkLabel
  ] = await Promise.all([
    env.SITE_CONFIG.get("DEFAULT_ROLE"),
    env.SITE_CONFIG.get("EMAIL_DOMAINS"),
    env.SITE_CONFIG.get("ADMIN_CONTACT"),
    env.SITE_CONFIG.get("MAX_EMAILS"),
    env.SITE_CONFIG.get("TURNSTILE_ENABLED"),
    env.SITE_CONFIG.get("TURNSTILE_SITE_KEY"),
    env.SITE_CONFIG.get("TURNSTILE_SECRET_KEY"),
    env.SITE_CONFIG.get("SOURCE_LINK_ENABLED"),
    env.SITE_CONFIG.get("SOURCE_LINK_URL"),
    env.SITE_CONFIG.get("SOURCE_LINK_LABEL")
  ])

  return Response.json({
    defaultRole: defaultRole || ROLES.CIVILIAN,
    emailDomains: emailDomains || "example.com",
    adminContact: adminContact || "",
    maxEmails: maxEmails || EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString(),
    turnstile: canManageConfig ? {
      enabled: turnstileEnabled === "true",
      siteKey: turnstileSiteKey || "",
      secretKeyConfigured: Boolean(turnstileSecretKey),
    } : undefined,
    sourceLink: {
      enabled: sourceLinkEnabled === "true",
      url: sourceLinkUrl || "",
      label: sourceLinkLabel || "Source code",
    }
  })
}

export async function POST(request: Request) {
  const canAccess = await checkPermission(PERMISSIONS.MANAGE_CONFIG)

  if (!canAccess) {
    return Response.json({
      error: "权限不足"
    }, { status: 403 })
  }

  const {
    defaultRole,
    emailDomains,
    adminContact,
    maxEmails,
    sourceLink,
    turnstile
  } = await request.json() as SiteConfigRequest
  
  if (![ROLES.DUKE, ROLES.KNIGHT, ROLES.CIVILIAN].includes(defaultRole)) {
    return Response.json({ error: "无效的角色" }, { status: 400 })
  }

  const turnstileConfig = turnstile ?? {
    enabled: false,
    siteKey: "",
    secretKey: "",
    preserveExistingSecretKey: false,
  }

  const env = getRequestContext().env
  const existingTurnstileSecretKey = await env.SITE_CONFIG.get("TURNSTILE_SECRET_KEY")
  const nextTurnstileSecretKey = turnstileConfig.preserveExistingSecretKey
    ? (existingTurnstileSecretKey || "")
    : (turnstileConfig.secretKey || "")

  if (turnstileConfig.enabled && (!turnstileConfig.siteKey || !nextTurnstileSecretKey)) {
    return Response.json({ error: "Turnstile 启用时需要提供 Site Key 和 Secret Key" }, { status: 400 })
  }

  await Promise.all([
    env.SITE_CONFIG.put("DEFAULT_ROLE", defaultRole),
    env.SITE_CONFIG.put("EMAIL_DOMAINS", emailDomains),
    env.SITE_CONFIG.put("ADMIN_CONTACT", adminContact),
    env.SITE_CONFIG.put("MAX_EMAILS", maxEmails),
    env.SITE_CONFIG.put("SOURCE_LINK_ENABLED", Boolean(sourceLink?.enabled).toString()),
    env.SITE_CONFIG.put("SOURCE_LINK_URL", sourceLink?.url || ""),
    env.SITE_CONFIG.put("SOURCE_LINK_LABEL", sourceLink?.label || "Source code"),
    env.SITE_CONFIG.put("TURNSTILE_ENABLED", turnstileConfig.enabled.toString()),
    env.SITE_CONFIG.put("TURNSTILE_SITE_KEY", turnstileConfig.siteKey),
    env.SITE_CONFIG.put("TURNSTILE_SECRET_KEY", nextTurnstileSecretKey)
  ])

  return Response.json({ success: true })
} 
