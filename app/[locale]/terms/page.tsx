import Link from "next/link"
import type { Metadata } from "next"
import type { Locale } from "@/i18n/config"
import { LegalFooter } from "@/components/layout/legal-footer"

export const runtime = "edge"

const copy = {
  en: {
    title: "Terms of Service",
    intro: "These terms govern your access to and use of MoeMail. By using the service, you agree to these terms.",
    sections: [
      ["Service", "MoeMail provides temporary email addresses, message handling, sharing, and related account features. Features, retention periods, limits, and availability may change as the service evolves."],
      ["Acceptable use", "You must use MoeMail lawfully. You may not use the service to send spam, impersonate others, violate privacy or intellectual-property rights, distribute malware, evade platform safeguards, disrupt systems, or facilitate fraud or abuse."],
      ["Accounts", "You are responsible for activity under your account and for keeping access to your sign-in provider secure. You must provide accurate information and promptly notify the service operator if you suspect unauthorized account use."],
      ["Temporary data", "Temporary addresses and messages may expire or be deleted according to service settings. MoeMail is not an archival or backup service. You are responsible for saving any information you need to retain."],
      ["Availability", "The service is provided on an as-available basis. We may modify, suspend, limit, or discontinue functionality to maintain security, reliability, legal compliance, or operational viability."],
      ["Disclaimer and liability", "To the extent permitted by applicable law, the service is provided without warranties of uninterrupted operation or fitness for a particular purpose. MoeMail is not responsible for indirect losses resulting from service interruption, message delivery failure, or loss of temporary data."],
      ["Enforcement and changes", "Access may be limited or terminated for violations of these terms or risks to users and the service. We may update these terms, and the effective date below identifies the latest revision."],
    ],
    effective: "Effective date: August 28, 2026",
    home: "Back to MoeMail",
  },
  "zh-CN": {
    title: "服务条款",
    intro: "本条款适用于您对 MoeMail 的访问和使用。使用本服务即表示您同意遵守本条款。",
    sections: [
      ["服务内容", "MoeMail 提供临时邮箱地址、邮件处理、分享和相关账户功能。随着服务演进，功能、保留期限、使用限制和可用性可能发生变化。"],
      ["合理使用", "您必须合法使用 MoeMail。不得利用本服务发送垃圾信息、冒充他人、侵犯隐私或知识产权、传播恶意软件、规避平台保护措施、破坏系统，或协助欺诈及其他滥用行为。"],
      ["账户责任", "您应对自己账户下的活动负责，并妥善保护登录服务商的访问权限。您应提供准确信息；如怀疑账户被未授权使用，应及时通知服务运营方。"],
      ["临时数据", "临时地址和邮件可能根据服务设置过期或删除。MoeMail 不是归档或备份服务；您有责任保存需要长期保留的信息。"],
      ["服务可用性", "本服务按实际可用状态提供。为保障安全性、可靠性、法律合规或持续运营，我们可能修改、暂停、限制或停止部分功能。"],
      ["免责声明与责任限制", "在适用法律允许的范围内，我们不保证服务永不中断或适用于特定目的。对于服务中断、邮件投递失败或临时数据丢失造成的间接损失，MoeMail 不承担责任。"],
      ["执行与变更", "如果您违反本条款，或对用户和服务造成风险，我们可能限制或终止您的访问。我们可能更新本条款，下方生效日期表示最近一次修订时间。"],
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

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
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
