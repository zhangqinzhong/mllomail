"use client"

import Image from "next/image"
import Link from "next/link"

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 transition-opacity hover:opacity-80"
    >
      <Image
        src="/icons/mllomail-logo-192.png"
        alt="MlloMail cat paw logo"
        width={32}
        height={32}
        priority
        className="rounded-lg"
      />
      <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text font-bold tracking-wider text-transparent">
        MlloMail
      </span>
    </Link>
  )
}
