export { Buffer } from 'node:buffer'
import { AsyncLocalStorage } from 'node:async_hooks'
const requests = new AsyncLocalStorage()
export function runRequest(request, env, ctx, callback) {
  const headers = new Headers(request.headers)
  const url = new URL(request.url)
  headers.set('host', url.host)
  headers.set('x-forwarded-host', url.host)
  headers.set('x-forwarded-proto', url.protocol.slice(0,-1))
  return requests.run({request, env, ctx, headers}, callback)
}
export function context() {
  const state = requests.getStore()
  if (!state) throw new Error('Worker request context is unavailable')
  return state
}
export const nativeEnv = new Proxy({}, {
 get:(_,key)=>key === 'NODE_ENV' ? 'production' : context().env[key],
 ownKeys:()=>Reflect.ownKeys(context().env),
 getOwnPropertyDescriptor:(_,key)=>({enumerable:true,configurable:true,value:context().env[key]})
})
export function getRequestContext() { const {env,ctx,request}=context();return {env,ctx,cf:request.cf} }
export async function headers() { return context().headers }
// Server Actions are not part of the API dispatcher. Fail closed if added later.
export async function cookies() { throw new Error('Server Action cookies are unsupported in API runtime') }
export function redirect() { throw new Error('Server Action redirects are unsupported in API runtime') }
export class NextRequest extends Request {
  get nextUrl() { const url = new URL(this.url);url.clone=()=>new URL(url);return url }
}
export class NextResponse extends Response {
  static next(options = {}) { return {continue:true, requestHeaders:options.request?.headers} }
  static rewrite() { throw new Error('Page rewrites are unsupported in API runtime') }
  static redirect(url, status=307) { return Response.redirect(url,status) }
}
