import { staticPageRoutes } from './static-pages.mjs'
import { buildApiRuntime } from './build-api-runtime.mjs'
import { build } from 'esbuild'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const outputDir = resolve(".vercel/output/static")
const routesPath = resolve(outputDir, "_routes.json")
const staticAssets = ["/oauth-home.html"]
// Only real public files bypass Functions. Never exclude API or account routes.
const staticRoutes = ["/oauth-home", ...readdirSync(resolve("public"), { withFileTypes: true })
  .filter(entry => !entry.name.startsWith("_") && !entry.name.startsWith("."))
  .map(entry => `/${entry.name}${entry.isDirectory() ? "/*" : ""}`)]

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

for (const route of staticRoutes) {
  if (!routes.exclude.includes(route)) {
    routes.exclude.push(route)
  }
}

writeFileSync(routesPath, `${JSON.stringify(routes, null, 2)}\n`)
console.log(`Prepared static asset routes: ${staticRoutes.join(", ")}`)

// The legacy next-on-pages adapter still routes SSG HTML through its catch-all.
// Resolve the build-verified public paths before importing that runtime; retain
// the RSC response used by client navigation, without ever caching user data.
const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'))
const publicPaths = Object.entries(manifest.routes)
  .filter(([, config]) => staticPageRoutes.includes(config.srcRoute))
  .map(([path]) => path)
if (publicPaths.length !== staticPageRoutes.length * 5) throw new Error('Missing prerendered pages')
for (const path of publicPaths) {
  for (const suffix of ['.html', '.rsc']) {
    if (!existsSync(resolve(outputDir, path.slice(1) + suffix))) throw new Error(`Missing public asset: ${path}${suffix}`)
  }
}
const workerDir = resolve(outputDir, '_worker.js')
const entryPath = resolve(workerDir, 'index.js')
const original = readFileSync(entryPath, 'utf8')
if (!original.includes('// mllomail-public-router')) {
  writeFileSync(resolve(workerDir, 'next-handler.js'), original)
}
copyFileSync(resolve('scripts/legacy-page-redirects.mjs'), resolve(workerDir,'legacy-page-redirects.mjs'))
copyFileSync(resolve('scripts/pages-public-router.mjs'), resolve(workerDir, 'public-router.mjs'))
await build({entryPoints:['scripts/mail-poll-router.mjs'], outfile:resolve(workerDir,'mail-poll-router.mjs'), bundle:true, format:'esm', platform:'browser', target:'es2022', minify:true})
await buildApiRuntime(workerDir)
writeFileSync(entryPath, `// mllomail-public-router
import { legacyPageRedirect } from './legacy-page-redirects.mjs';
import { servePublicPage } from './public-router.mjs';
import { serveApi, authorizeStaticPage } from './api-runtime.mjs';
import { serveMailPoll } from './mail-poll-router.mjs';
const routes = ${JSON.stringify(publicPaths)};
let firstRequest = true;
export default {
  async fetch(request, env, ctx) {
    if (firstRequest) { firstRequest=false; console.info("mllomail:isolate-first-request"); }
    const legacy = legacyPageRedirect(request);
    if (legacy) return legacy;
    const guard = await authorizeStaticPage(request, env, ctx);
    if (guard) return guard;
    const response = await servePublicPage(request, env, routes);
    if (response) return response;
    if (request.method === 'GET' && new URL(request.url).pathname.startsWith('/api/emails/')) {
      const poll = await serveMailPoll(request, env);
      if (poll) return poll;
    }
    const api = await serveApi(request, env, ctx);
    if (api) return api;
    const url = new URL(request.url);
    if (url.pathname === '/_next/image') {
      const { default: next } = await import('./next-handler.js');
      return next.fetch(request, env, ctx);
    }
    if (!url.pathname.includes('.') && !/^\\/(en|zh-CN|zh-TW|ja|ko)(\\/|$)/.test(url.pathname) && !url.pathname.startsWith('/api')) {
      url.pathname = '/en' + url.pathname;
      return Response.redirect(url,307);
    }
    return env.ASSETS.fetch(request);
  }
};\n`)
