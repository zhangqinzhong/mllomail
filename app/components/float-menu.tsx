"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SourceLinkConfig {
  enabled: boolean
  url: string
  label: string
}

export function FloatMenu() {
  const pathname = usePathname()
  const [sourceLink, setSourceLink] = useState<SourceLinkConfig | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchConfig() {
      try {
        const res = await fetch("/api/config")
        if (!res.ok) return

        const data = await res.json() as { sourceLink?: SourceLinkConfig }
        if (!cancelled) {
          setSourceLink(data.sourceLink ?? null)
        }
      } catch {
        if (!cancelled) {
          setSourceLink(null)
        }
      }
    }

    fetchConfig()

    return () => {
      cancelled = true
    }
  }, [])
  
  if (pathname.includes("/shared/") || !sourceLink?.enabled || !sourceLink.url) {
    return null
  }
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-white dark:bg-background rounded-full shadow-lg group relative border-primary/20"
              onClick={() => window.open(sourceLink.url, "_blank", "noopener,noreferrer")}
            >
              <Github 
                className="w-4 h-4 transition-all duration-300 text-primary group-hover:scale-110"
              />
              <span className="sr-only">{sourceLink.label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p>{sourceLink.label}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
