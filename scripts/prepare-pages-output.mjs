import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const outputDir = resolve(".vercel/output/static")
const routesPath = resolve(outputDir, "_routes.json")
const staticAssets = ["/oauth-home.html"]

if (!existsSync(outputDir)) {
  throw new Error(`Cloudflare Pages output directory does not exist: ${outputDir}`)
}

for (const asset of staticAssets) {
  const source = resolve("public", asset.slice(1))
  const destination = resolve(outputDir, asset.slice(1))
  mkdirSync(dirname(destination), { recursive: true })
  copyFileSync(source, destination)
}

copyFileSync(resolve("public/_headers"), resolve(outputDir, "_headers"))

if (!existsSync(routesPath)) {
  throw new Error(`Cloudflare Pages routes file does not exist: ${routesPath}`)
}

const routes = JSON.parse(readFileSync(routesPath, "utf8"))
routes.exclude = Array.isArray(routes.exclude) ? routes.exclude : []

for (const asset of staticAssets) {
  if (!routes.exclude.includes(asset)) {
    routes.exclude.push(asset)
  }
}

writeFileSync(routesPath, `${JSON.stringify(routes, null, 2)}\n`)
console.log(`Prepared static OAuth homepage: ${staticAssets.join(", ")}`)
