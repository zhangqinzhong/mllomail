import NextAuth from '../../node_modules/next-auth/index.js'
import {setEnvDefaults, reqWithEnvURL} from '../../node_modules/next-auth/lib/env.js'
import {getToken} from 'next-auth/jwt'
import {init} from '../../node_modules/@auth/core/lib/init.js'
import {session as sessionAction} from '../../node_modules/@auth/core/lib/actions/session.js'
import {SessionStore} from '../../node_modules/@auth/core/lib/utils/cookie.js'
import {toResponse} from '../../node_modules/@auth/core/lib/utils/web.js'
import {parse} from '../../node_modules/@auth/core/lib/vendored/cookie.js'
import {context} from './context.mjs'

// Reuse Auth.js cryptography, cookie rotation, CSRF and callbacks unchanged.
// Internal authorization does not need OAuth provider normalization or re-signing
// a cookie that the original auth() helper discards anyway.
export default function NativeNextAuth(config) {
 const original=NextAuth(config)
 async function getConfig(request){const result=typeof config==='function'?await config(request):{...config};setEnvDefaults(result);return result}
 async function auth(...args){
  if(args.length)return original.auth(...args)
  const state=context()
  state.session ??= (async()=>{
   const cfg=await getConfig(undefined)
   if(!cfg.trustHost || cfg.session?.strategy!=='jwt' || cfg.jwt?.decode)return original.auth()
   const request=reqWithEnvURL(state.request)
   const token=await getToken({req:{headers:new Headers({cookie:state.headers.get('cookie')??''})},secret:cfg.secret,secureCookie:cfg.useSecureCookies??new URL(request.url).protocol==='https:',cookieName:cfg.cookies?.sessionToken?.name})
   if(!token)return null
   const payload=await cfg.callbacks.jwt({token})
   if(!payload)return null
   const session={user:{name:payload.name,email:payload.email,image:payload.picture},expires:new Date(Date.now()+(cfg.session.maxAge??2592000)*1000).toISOString()}
   return cfg.callbacks.session({session,token:payload})
  })()
  return state.session
 }
 async function GET(request){
  const path=new URL(request.url).pathname
  if(!['/api/auth/session','/api/auth/csrf','/api/auth/providers'].includes(path))return original.handlers.GET(request)
  const cfg=await getConfig(request)
  if(!cfg.trustHost || cfg.session?.strategy!=='jwt')return original.handlers.GET(request)
  const req=reqWithEnvURL(request),url=new URL(req.url),action=path.endsWith('/csrf')?'csrf':'session'
  if(path.endsWith('/providers')) {
   const base=new URL(cfg.basePath??'/api/auth',url.origin).href
   const providers=Object.fromEntries(cfg.providers.map(value=>{const provider=typeof value==='function'?value():value;const p={...provider,...provider.options};return [p.id,{id:p.id,name:p.name,type:p.type,signinUrl:base+'/signin/'+p.id,callbackUrl:base+'/callback/'+p.id}]}))
   return Response.json(providers)
  }
  const requestCookies=parse(req.headers.get('cookie')??'')
  const {options,cookies}=await init({authOptions:{...cfg,providers:[]},action,url,cookies:requestCookies,callbackUrl:url.searchParams.get('callbackUrl'),isPost:false})
  if(action==='csrf')return toResponse({body:{csrfToken:options.csrfToken},headers:{'Content-Type':'application/json','Cache-Control':'private, no-cache, no-store','Pragma':'no-cache','Expires':'0'},cookies})
  return toResponse(await sessionAction(options,new SessionStore(options.cookies.sessionToken,requestCookies,options.logger),cookies))
 }
 return {...original,auth,handlers:{...original.handlers,GET}}
}
