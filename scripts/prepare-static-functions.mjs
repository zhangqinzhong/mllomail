import { staticPageRoutes } from './static-pages.mjs'
import { readFileSync, existsSync, rmSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

// Vercel 39 emits Node fallback bundles even for dynamicParams=false SSG routes.
// next-on-pages 1.x mistakes those unreachable bundles for dynamic Node functions.
// Remove only static fallback routes after verifying all static variants.
const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'))
for (const route of staticPageRoutes) {
  if (manifest.dynamicRoutes[route]?.fallback !== false) {
    throw new Error(`Refusing to remove a live fallback: ${route}`)
  }
  const variants = Object.entries(manifest.routes).filter(([, config]) => config.srcRoute === route)
  if (variants.length !== 5) throw new Error(`Missing locale variants for ${route}`)
  for (const [path] of variants) {
    for (const suffix of ['', '.rsc']) {
      const configPath = resolve('.vercel/output/functions', `${path.slice(1)}${suffix}.prerender-config.json`)
      if (!existsSync(configPath)) throw new Error(`Missing prerender config: ${path}${suffix}`)
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      if (config.expiration !== false || config.fallback?.type !== 'FileFsRef') {
        throw new Error(`Unexpected dynamic prerender: ${path}${suffix}`)
      }
      const source = resolve(dirname(configPath), config.fallback.fsPath)
      const destination = resolve('.vercel/output/static', path.slice(1) + (suffix === '.rsc' ? '.rsc' : '.html'))
      if (!existsSync(source)) throw new Error(`Missing prerender payload: ${source}`)
      mkdirSync(dirname(destination), { recursive: true })
      copyFileSync(source, destination)
    }
  }
  for (const suffix of ['', '.rsc']) {
    rmSync(resolve('.vercel/output/functions', `${route.slice(1)}${suffix}.func`), { recursive: true, force: true })
  }
}
console.log(`Verified ${staticPageRoutes.length * 5} static pages; removed unreachable Node fallback bundles.`)
