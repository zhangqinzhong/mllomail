import Link from "next/link"
import { LogIn, Mail, ShieldCheck } from "lucide-react"
import type { Locale } from "@/i18n/config"

const content = {
  en: {
    eyebrow: "Public application information",
    title: "About MoeMail",
    description:
      "MoeMail is a temporary email service that helps users protect their primary inbox. Visitors can learn about the service on this page without creating an account or signing in.",
    features: [
      ["Temporary mailboxes", "Create disposable email addresses and receive messages without exposing your primary address."],
      ["Privacy-focused", "Use automatic expiration and mailbox sharing controls to manage temporary messages."],
      ["Google Sign-In", "Google Sign-In is optional and is used only to authenticate an account. MoeMail receives basic profile and email information and does not access Gmail, Google Drive, contacts, or calendars."],
    ],
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
  zh: {
    eyebrow: "公开应用信息",
    title: "关于 MoeMail",
    description:
      "MoeMail 是一项临时邮箱服务，帮助用户保护常用邮箱地址。访客无需创建账户或登录，即可在本页面了解服务用途和主要功能。",
    features: [
      ["临时邮箱", "创建一次性邮箱地址并接收邮件，无需暴露您的常用邮箱。"],
      ["注重隐私", "通过自动过期和邮箱分享控制，管理临时邮件和访问权限。"],
      ["Google 登录", "Google 登录是可选的，仅用于账户身份验证。MoeMail 只接收基本个人资料和邮箱信息，不会访问 Gmail、Google Drive、通讯录或日历。"],
    ],
    privacy: "隐私政策",
    terms: "服务条款",
  },
} as const

const icons = [Mail, ShieldCheck, LogIn]

export function PublicAppInfo({ locale }: { locale: Locale }) {
  const copy = locale === "zh-CN" || locale === "zh-TW" ? content.zh : content.en

  return (
    <section id="about" aria-labelledby="about-moemail" className="pb-16 sm:pb-20">
      <div className="mx-auto max-w-5xl rounded-2xl border bg-background/90 p-6 shadow-sm sm:p-10">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">{copy.eyebrow}</p>
        <h2 id="about-moemail" className="mt-2 text-3xl font-bold tracking-tight">
          {copy.title}
        </h2>
        <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{copy.description}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {copy.features.map(([title, description], index) => {
            const Icon = icons[index]
            return (
              <div key={title} className="rounded-xl border bg-muted/30 p-5">
                <Icon aria-hidden="true" className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link className="font-medium text-primary hover:underline" href={`/${locale}/privacy`}>
            {copy.privacy}
          </Link>
          <Link className="font-medium text-primary hover:underline" href={`/${locale}/terms`}>
            {copy.terms}
          </Link>
        </div>
      </div>
    </section>
  )
}
