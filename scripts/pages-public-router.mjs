// Serve only build-verified public pages without loading the Next.js runtime.
// Account pages and APIs always use the original authenticated application.
export function publicPagePath(request, routes) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null
  const pathname = new URL(request.url).pathname.replace(/\/$/, '') || '/'
  const route = pathname === '/' ? '/en' : pathname
  if (!routes.includes(route)) return null
  return route + (request.headers.get('RSC') === '1' ? '.rsc' : '')
}
export async function servePublicPage(request, env, routes) {
  const path = publicPagePath(request, routes)
  if (path === null) return null
  const url = new URL(request.url)
  url.pathname = path
  url.search = ''
  const asset = await env.ASSETS.fetch(new Request(url, {method:request.method}))
  const response = new Response(asset.body, asset)
  response.headers.set('Vary', 'RSC, Next-Router-State-Tree, Next-Router-Prefetch')
  response.headers.set('Cache-Control', 'no-cache')
  if (path.endsWith('.rsc')) response.headers.set('Content-Type','text/x-component; charset=utf-8')
  response.headers.set('X-MlloMail-Render','static')
  return response
}
