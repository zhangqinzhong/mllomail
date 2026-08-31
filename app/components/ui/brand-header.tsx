"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ExternalLink, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BrandHeaderProps {
  title?: string
  subtitle?: string
  ctaText?: string
}

export function BrandHeader({
  title,
  subtitle,
  ctaText,
}: BrandHeaderProps) {
  const t = useTranslations("emails.shared.brand")

  const displayTitle = title || t("title")
  const displaySubtitle = subtitle || t("subtitle")
  const displayCtaText = ctaText || t("cta")

  return (
    <div className="space-y-4 text-center lg:pb-4">
      <div className="flex justify-center pt-2">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Image
            src="/icons/mllomail-logo-192.png"
            alt="MlloMail cat paw logo"
            width={48}
            height={48}
            className="rounded-xl transition-transform duration-200 group-hover:scale-105"
          />
          <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-3xl font-bold tracking-wider text-transparent">
            MlloMail
          </span>
        </Link>
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
          {displayTitle}
        </h1>
        <p className="mx-auto max-w-md text-gray-600 dark:text-gray-300">
          {displaySubtitle}
        </p>
      </div>

      <div className="flex justify-center">
        <Button
          asChild
          size="lg"
          className="h-auto min-h-10 gap-2 bg-primary px-8 py-1 text-white hover:bg-primary/90"
        >
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <Mail className="h-5 w-5" />
            {displayCtaText}
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
