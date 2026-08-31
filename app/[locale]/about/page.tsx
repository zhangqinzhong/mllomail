import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Clock, Code2, LogIn, Mail, ShieldCheck, Share2 } from "lucide-react"
import type { Locale } from "@/i18n/config"
import { LegalFooter } from "@/components/layout/legal-footer"

export const runtime = "edge"

const description =
  "MlloMail is a temporary email service for protecting a primary inbox, receiving short-lived messages, sharing mailboxes, and developer testing."

function getBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.CUSTOM_DOMAIN
  if (!configuredBaseUrl) return "http://localhost:3000"
  return (/^https?:\/\//i.test(configuredBaseUrl) ? configuredBaseUrl : `https://${configuredBaseUrl}`).replace(/\/$/, "")
}

export async function generateMetadata(): Promise<Metadata> {
  const homepage = `${getBaseUrl()}/en/about`

  return {
    title: "MlloMail",
    description,
    alternates: { canonical: homepage },
    openGraph: {
      type: "website",
      title: "MlloMail",
      description,
      siteName: "MlloMail",
      url: homepage,
    },
    robots: { index: true, follow: true },
  }
}

const features = [
  {
    icon: Mail,
    title: "Temporary mailboxes",
    description: "Create disposable email addresses and receive messages without publishing your primary email address.",
  },
  {
    icon: Clock,
    title: "Automatic expiration",
    description: "Choose an expiration period for temporary addresses and avoid keeping short-lived inboxes indefinitely.",
  },
  {
    icon: Share2,
    title: "Mailbox sharing",
    description: "Share selected temporary mailbox content through controlled links when collaboration is needed.",
  },
  {
    icon: Code2,
    title: "Developer API",
    description: "Use API-based workflows for software testing, automation, and temporary email integration.",
  },
]

export default async function PublicHomepage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  const locale = rawLocale as Locale

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <header className="border-b bg-background/90">
        <div className="container mx-auto flex max-w-5xl items-center gap-3 px-5 py-5">
          <Image
            src="/icons/mllomail-oauth-120.png"
            alt="MlloMail cat paw logo"
            width={48}
            height={48}
            priority
            className="rounded-xl"
          />
          <span className="text-xl font-bold tracking-wide text-primary">MlloMail</span>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <section aria-labelledby="mllomail-title" className="rounded-2xl border bg-background p-7 shadow-sm sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Public application homepage</p>
          <h1 id="mllomail-title" className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            MlloMail
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{description}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            No sign-in is required to view this application information.
          </div>
        </section>

        <section aria-labelledby="features-title" className="py-12">
          <h2 id="features-title" className="text-3xl font-bold tracking-tight">What MlloMail does</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description: featureDescription }) => (
              <article key={title} className="rounded-xl border bg-background p-6">
                <Icon aria-hidden="true" className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 leading-7 text-muted-foreground">{featureDescription}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="google-data-title" className="rounded-2xl border bg-background p-7 sm:p-10">
          <div className="flex items-center gap-3">
            <LogIn aria-hidden="true" className="h-7 w-7 text-primary" />
            <h2 id="google-data-title" className="text-2xl font-bold">Google Sign-In and user data</h2>
          </div>
          <div className="mt-5 space-y-4 leading-7 text-muted-foreground">
            <p>
              Google Sign-In is optional and is used only to authenticate a MlloMail account. MlloMail receives the basic profile information provided by Google: name, email address, profile image, and provider account identifier.
            </p>
            <p>
              MlloMail does not request access to Gmail, Google Drive, Google Contacts, Google Calendar, or other Google account content. Google user data is not sold and is not used for advertising.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium">
            <Link className="text-primary hover:underline" href={`/${locale}/privacy`}>Privacy Policy</Link>
            <Link className="text-primary hover:underline" href={`/${locale}/terms`}>Terms of Service</Link>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="text-sm text-muted-foreground">Application information is available publicly. Signing in is required only when a user chooses to access account-specific mailbox features.</p>
          <Link className="mt-5 inline-flex rounded-lg bg-primary px-6 py-3 font-medium text-white transition-opacity hover:opacity-90" href={`/${locale}`}>
            Open MlloMail
          </Link>
        </section>
      </main>

      <LegalFooter locale={locale} />
    </div>
  )
}
