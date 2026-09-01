import { NextResponse } from "next/server"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"
import { EMAIL_CONFIG } from "@/config"

export const runtime = "edge"

interface EmailServiceConfig {
  enabled: boolean
  apiKey?: string
  preserveExistingApiKey?: boolean
  roleLimits: {
    duke?: number
    knight?: number
  }
}

export async function GET() {
  const canAccess = await checkPermission(PERMISSIONS.MANAGE_CONFIG)

  if (!canAccess) {
    return NextResponse.json({
      error: "权限不足"
    }, { status: 403 })
  }

  try {
    const env = getRequestContext().env
    const [enabled, apiKey, roleLimits] = await Promise.all([
      env.SITE_CONFIG.get("EMAIL_SERVICE_ENABLED"),
      env.SITE_CONFIG.get("RESEND_API_KEY"),
      env.SITE_CONFIG.get("EMAIL_ROLE_LIMITS")
    ])

    const customLimits = roleLimits ? JSON.parse(roleLimits) : {}
    
    const finalLimits = {
      duke: customLimits.duke !== undefined ? customLimits.duke : EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.duke,
      knight: customLimits.knight !== undefined ? customLimits.knight : EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.knight,
    }

    return NextResponse.json({
      enabled: enabled === "true",
      apiKeyConfigured: Boolean(apiKey),
      roleLimits: finalLimits
    })
  } catch (error) {
    console.error("Failed to get email service config:", error)
    return NextResponse.json(
      { error: "获取 Resend 发件服务配置失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const canAccess = await checkPermission(PERMISSIONS.MANAGE_CONFIG)

  if (!canAccess) {
    return NextResponse.json({
      error: "权限不足"
    }, { status: 403 })
  }

  try {
    const config = await request.json() as EmailServiceConfig
    const roleLimits = [config.roleLimits?.duke, config.roleLimits?.knight]
    if (roleLimits.some((limit) => (
      limit === undefined || !Number.isInteger(limit) || limit < -1 || limit > 10000
    ))) {
      return NextResponse.json(
        { error: "每日发件额度必须是 -1 到 10000 的整数" },
        { status: 400 }
      )
    }

    const env = getRequestContext().env
    const existingApiKey = await env.SITE_CONFIG.get("RESEND_API_KEY")
    const nextApiKey = config.preserveExistingApiKey ? (existingApiKey || "") : (config.apiKey || "")

    if (config.enabled && !nextApiKey) {
      return NextResponse.json(
        { error: "启用 Resend 时，API Key 为必填项" },
        { status: 400 }
      )
    }
    
    const customLimits: { duke?: number; knight?: number } = {}
    if (config.roleLimits?.duke !== undefined) {
      customLimits.duke = config.roleLimits.duke
    }
    if (config.roleLimits?.knight !== undefined) {
      customLimits.knight = config.roleLimits.knight
    }

    await Promise.all([
      env.SITE_CONFIG.put("EMAIL_SERVICE_ENABLED", config.enabled.toString()),
      env.SITE_CONFIG.put("RESEND_API_KEY", nextApiKey),
      env.SITE_CONFIG.put("EMAIL_ROLE_LIMITS", JSON.stringify(customLimits))
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save email service config:", error)
    return NextResponse.json(
      { error: "保存 Resend 发件服务配置失败" },
      { status: 500 }
    )
  }
} 
