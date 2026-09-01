"use client"

import { Settings } from "lucide-react"
import { useTranslations } from "next-intl"
import { WebsiteConfigPanel } from "@/components/profile/website-config-panel"
import { EmailServiceConfig } from "@/components/profile/email-service-config"

export function AdminSettings() {
  const t = useTranslations("admin")

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start gap-3 rounded-2xl border bg-background p-5 shadow-sm">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.description")}</p>
        </div>
      </header>

      <WebsiteConfigPanel />
      <EmailServiceConfig />
    </div>
  )
}
