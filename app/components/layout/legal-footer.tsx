import Link from "next/link"
import type { Locale } from "@/i18n/config"

const labels: Record<Locale, { privacy: string; terms: string }> = {
  en: { privacy: "Privacy Policy", terms: "Terms of Service" },
  "zh-CN": { privacy: "隐私政策", terms: "服务条款" },
  "zh-TW": { privacy: "隱私政策", terms: "服務條款" },
  ja: { privacy: "プライバシーポリシー", terms: "利用規約" },
  ko: { privacy: "개인정보처리방침", terms: "서비스 약관" },
}

export function LegalFooter({ locale }: { locale: Locale }) {
  const label = labels[locale]

  return (
    <footer className="border-t bg-background/80">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-5 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} MlloMail</span>
        <Link className="transition-colors hover:text-primary" href={`/${locale}/privacy`}>
          {label.privacy}
        </Link>
        <Link className="transition-colors hover:text-primary" href={`/${locale}/terms`}>
          {label.terms}
        </Link>
      </div>
    </footer>
  )
}
