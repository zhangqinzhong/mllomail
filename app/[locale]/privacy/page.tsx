import Link from "next/link"
import type { Metadata } from "next"
import type { Locale } from "@/i18n/config"
import { LegalFooter } from "@/components/layout/legal-footer"

export const runtime = "edge"

const copy = {
  en: {
    title: "Privacy Policy",
    intro: "MoeMail provides temporary email addresses and account-based mailbox features. This policy explains how information is handled when you use the service.",
    sections: [
      ["Information we process", "When you sign in with Google or GitHub, we receive basic account information such as your name, email address, profile image, and provider account identifier. We also process mailbox addresses, messages, service settings, session information, and basic security logs needed to operate the service."],
      ["How information is used", "We use this information only to authenticate you, provide and secure your account, deliver requested mailbox features, prevent abuse, diagnose failures, and maintain the service."],
      ["Google user data", "MoeMail requests only basic sign-in profile and email information. It does not request access to Gmail, Google Drive, contacts, calendars, or other Google account content. Google user data is not sold or used for advertising."],
      ["Storage and sharing", "Service data may be processed by infrastructure and authentication providers that are necessary to operate MoeMail. We do not sell personal information. Data is retained only as long as needed to provide the service, meet security requirements, or comply with applicable law."],
      ["Cookies and security", "MoeMail uses essential cookies or similar storage for authentication, language, theme, and security. We apply reasonable safeguards, but no Internet service can guarantee absolute security."],
      ["Your choices", "You may stop using the service at any time and revoke Google access from your Google Account. Requests concerning account information can be sent to the support address shown on the OAuth consent screen."],
      ["Changes", "We may update this policy when the service or legal requirements change. The effective date below identifies the latest revision."],
    ],
    effective: "Effective date: August 28, 2026",
    home: "Back to MoeMail",
  },
  "zh-CN": {
    title: "隐私政策",
    intro: "MoeMail 提供临时邮箱地址和基于账户的邮箱功能。本政策说明您使用本服务时，我们如何处理相关信息。",
    sections: [
      ["我们处理的信息", "当您使用 Google 或 GitHub 登录时，我们会接收姓名、电子邮箱地址、头像和服务商账户标识等基本账户信息。我们还会处理运行服务所需的邮箱地址、邮件、服务设置、会话信息和基本安全日志。"],
      ["信息用途", "这些信息仅用于身份验证、提供并保护您的账户、交付您请求的邮箱功能、防止滥用、排查故障和维护服务。"],
      ["Google 用户数据", "MoeMail 仅请求用于登录的基本个人资料和电子邮箱信息，不会请求访问 Gmail、Google Drive、通讯录、日历或其他 Google 账户内容。我们不会出售 Google 用户数据，也不会将其用于广告。"],
      ["存储与共享", "服务数据可能由运行 MoeMail 所必需的基础设施和身份验证服务商处理。我们不会出售个人信息。数据仅在提供服务、满足安全要求或遵守适用法律所需的期限内保留。"],
      ["Cookie 与安全", "MoeMail 使用必要的 Cookie 或类似存储来实现身份验证、语言、主题和安全功能。我们会采取合理保护措施，但任何互联网服务都无法保证绝对安全。"],
      ["您的选择", "您可以随时停止使用本服务，并在 Google 账户中撤销 Google 登录授权。与账户信息有关的请求，可以发送至 OAuth 同意屏幕中显示的支持邮箱。"],
      ["政策变更", "当服务或法律要求变化时，我们可能更新本政策。下方生效日期表示最近一次修订时间。"],
    ],
    effective: "生效日期：2026 年 8 月 28 日",
    home: "返回 MoeMail",
  },
} as const

type Copy = (typeof copy)[keyof typeof copy]

function getCopy(locale: Locale): Copy {
  return locale === "zh-CN" || locale === "zh-TW" ? copy["zh-CN"] : copy.en
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const content = getCopy(locale as Locale)
  return { title: `${content.title} | MoeMail`, description: content.intro }
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  const locale = rawLocale as Locale
  const content = getCopy(locale)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <main className="container mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <Link className="text-sm text-primary hover:underline" href={`/${locale}`}>
          ← {content.home}
        </Link>
        <article className="mt-7 rounded-2xl border bg-background p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
          <p className="mt-5 leading-7 text-muted-foreground">{content.intro}</p>
          <div className="mt-8 space-y-7">
            {content.sections.map(([title, body]) => (
              <section key={title}>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mt-2 leading-7 text-muted-foreground">{body}</p>
              </section>
            ))}
          </div>
          <p className="mt-9 border-t pt-5 text-sm text-muted-foreground">{content.effective}</p>
        </article>
      </main>
      <LegalFooter locale={locale} />
    </div>
  )
}
