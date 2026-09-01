"use client"

import React, { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Zap, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface EmailServiceConfig {
  enabled: boolean
  apiKey: string
  apiKeyConfigured?: boolean
  roleLimits: {
    duke: number
    knight: number
  }
}

interface EmailServiceConfigProps {
  onSaved?: () => void | Promise<void>
}

export function EmailServiceConfig({ onSaved }: EmailServiceConfigProps = {}) {
  const t = useTranslations("profile.emailService")
  const tCard = useTranslations("profile.card")
  const [config, setConfig] = useState<EmailServiceConfig>({
    enabled: false,
    apiKey: "",
    roleLimits: {
      duke: -1,
      knight: -1,
    }
  })
  const [loading, setLoading] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [apiKeyDirty, setApiKeyDirty] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config/email-service")
      if (res.ok) {
        const data = await res.json() as EmailServiceConfig
        setConfig({
          enabled: data.enabled,
          apiKey: "",
          apiKeyConfigured: Boolean(data.apiKeyConfigured),
          roleLimits: data.roleLimits,
        })
        setApiKeyDirty(false)
      }
    } catch (error) {
      console.error("Failed to fetch email service config:", error)
    }
  }

  const handleSave = async () => {
    const limits = [config.roleLimits.duke, config.roleLimits.knight]
    if (limits.some((limit) => !Number.isInteger(limit) || limit < -1 || limit > 10000)) {
      toast({ title: t("invalidLimit"), variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const saveData = {
        enabled: config.enabled,
        apiKey: apiKeyDirty ? config.apiKey : undefined,
        preserveExistingApiKey: !apiKeyDirty,
        roleLimits: config.roleLimits
      }

      const res = await fetch("/api/config/email-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      })

      if (!res.ok) {
        const error = await res.json() as { error: string }
        throw new Error(error.error || t("saveFailed"))
      }

      toast({
        title: t("saveSuccess"),
        description: t("saveSuccess"),
      })
      await onSaved?.()
    } catch (error) {
      toast({
        title: t("saveFailed"),
        description: error instanceof Error ? error.message : t("saveFailed"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border bg-background p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("panelDescription")}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="enabled" className="text-sm font-medium">
              {t("enable")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("enableDescription")}
            </p>
          </div>
          <Switch
            id="enabled"
            checked={config.enabled}
            onCheckedChange={(checked: boolean) =>
              setConfig((prev: EmailServiceConfig) => ({ ...prev, enabled: checked }))
            }
          />
        </div>

        {config.enabled && (
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm font-medium">
              {t("apiKey")}
            </Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showToken ? "text" : "password"}
                value={config.apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setApiKeyDirty(true)
                  setConfig((prev: EmailServiceConfig) => ({ ...prev, apiKey: e.target.value }))
                }}
                placeholder={config.apiKeyConfigured ? "••••••••" : t("apiKeyPlaceholder")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t("roleLimits")}</Label>
            <p className="mt-1 text-xs text-muted-foreground">{t("limitHint")}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: tCard("roles.EMPEROR"), value: t("unlimited") },
              { label: tCard("roles.CIVILIAN"), value: t("disabled") },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: tCard("roles.DUKE"), key: "duke" as const },
              { label: tCard("roles.KNIGHT"), key: "knight" as const },
            ].map((role) => (
              <div key={role.key} className="space-y-2 rounded-xl border p-4">
                <Label htmlFor={`role-limit-${role.key}`}>{role.label}</Label>
                <Input
                  id={`role-limit-${role.key}`}
                  type="number"
                  min={-1}
                  max={10000}
                  value={config.roleLimits[role.key]}
                  onChange={(event) => {
                    const value = event.target.value === "" ? 0 : Number(event.target.value)
                    setConfig((current) => ({
                      ...current,
                      roleLimits: { ...current.roleLimits, [role.key]: value },
                    }))
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfig((current) => ({
                      ...current,
                      roleLimits: { ...current.roleLimits, [role.key]: -1 },
                    }))}
                  >
                    {t("disabled")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfig((current) => ({
                      ...current,
                      roleLimits: { ...current.roleLimits, [role.key]: 0 },
                    }))}
                  >
                    {t("unlimited")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleSave}
          disabled={loading}
          className="w-full"
        >
          {loading ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  )
} 
