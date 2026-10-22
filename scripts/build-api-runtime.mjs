import {build} from 'esbuild'
import {readdirSync} from 'node:fs'
import {resolve} from 'node:path'
export async function buildApiRuntime(outputDir) {
 const files=[]
 function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,e.name);if(e.isDirectory())walk(path);else if(e.name==='route.ts')files.push(path)}}
 walk(resolve('app/api'))
 // Literal routes precede dynamic parameters; catch-all routes come last.
 files.sort((a,b)=>{
  const left=a.split('/'),right=b.split('/');const rank=s=>s.startsWith('[...')?2:s.startsWith('[')?1:0;
  for(let i=0;i<Math.min(left.length,right.length);i++){const delta=rank(left[i])-rank(right[i]);if(delta)return delta}
  return right.length-left.length || a.localeCompare(b)
 })
 const routes=files.map((path,i)=>{
  const parts=path.slice(resolve('app').length).replace(/\/route.ts$/,'').split('/').filter(Boolean)
  const keys=[];const regex=parts.map(part=>{if(part.startsWith('[...')){keys.push(part.slice(4,-1));return '(.+)'}if(part.startsWith('[')){keys.push(part.slice(1,-1));return '([^/]+)'}return part}).join('/')
  return `{pattern:new RegExp(${JSON.stringify('^/'+regex+'/?$')}),keys:${JSON.stringify(keys)},handler:r${i},catchAll:${parts.some(p=>p.startsWith('[...'))}}`
 })
 const source=`
 import {getToken} from 'next-auth/jwt';
 import {middleware} from './middleware.ts';
 import {runRequest,context,NextRequest} from './scripts/worker-runtime/context.mjs';
 ${files.map((p,i)=>`import * as r${i} from ${JSON.stringify(p)};`).join('\n')}
 const routes=[${routes.join(',\n')}];
 export async function authorizeStaticPage(request,env,ctx) {
  const url=new URL(request.url);const match=/^\\/(en|zh-CN|zh-TW|ja|ko)\\/(moe|profile|docs|admin(?:\\/(?:settings|users|user))?)\\/?$/.exec(url.pathname);
  if(!match)return null;
  return runRequest(request,env,ctx,async()=>{
   const token=await getToken({req:{headers:new Headers({cookie:request.headers.get('cookie')??''})},secret:env.AUTH_SECRET,secureCookie:url.protocol==='https:'});const locale=match[1],page=match[2];
   if(typeof token?.id!=='string' || !token.id)return Response.redirect(new URL('/'+locale+((page==='docs'||page.startsWith('admin'))?'/login':''),request.url),307);
   if(page.startsWith('admin')){const role=await env.DB.prepare('SELECT r.name FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE ur.user_id=?').bind(token.id).first();if(role?.name!=='emperor')return Response.redirect(new URL('/'+locale+'/profile',request.url),307);}
   return null;
  });
 }
 export async function serveApi(request,env,ctx) {
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return null;
  return runRequest(request,env,ctx,async()=>{
   try {
    const gate=await middleware(request);
    if(gate instanceof Response)return gate;
    if(!gate?.continue)throw new Error('Unsupported middleware response');
    if(gate.requestHeaders){context().headers=gate.requestHeaders;context().headers.set('host',url.host);context().headers.set('x-forwarded-host',url.host);context().headers.set('x-forwarded-proto',url.protocol.slice(0,-1));}
    const forwarded=new NextRequest(request,{headers:context().headers});
    for(const route of routes){
     const match=route.pattern.exec(url.pathname);if(!match)continue;
     const params={};route.keys.forEach((key,i)=>params[key]=route.catchAll ? match[i+1].split('/').map(decodeURIComponent) : decodeURIComponent(match[i+1]));
     const method=request.method==='HEAD'?'GET':request.method;
     const handler=route.handler[method];
     if(!handler)return new Response(null,{status:405,headers:{Allow:Object.keys(route.handler).filter(k=>/^(GET|POST|PUT|DELETE|PATCH|OPTIONS)$/.test(k)).join(', ')}});
     const response=await handler(forwarded,{params:Promise.resolve(params)});
     const result=new Response(request.method==='HEAD'?null:response.body,response);
     result.headers.set('X-MlloMail-Runtime','native-api');
     if(!result.headers.has('Cache-Control'))result.headers.set('Cache-Control','private, no-store');
     return result;
    }
    return new Response('Not Found',{status:404});
   }catch(error){console.error('API handler failed',error instanceof Error ? error.message : 'Unknown error');return Response.json({error:'Internal Server Error'},{status:500})}
  });
 }
 `
 const contextPath=resolve('scripts/worker-runtime/context.mjs')
 await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'native-api-entry.mjs'},outfile:resolve(outputDir,'api-runtime.mjs'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,external:['node:*'],define:{'process.env':'nativeEnv'},inject:[contextPath],plugins:[{name:'next-api-compat',setup(b){b.onResolve({filter:/^next-auth$/},()=>({path:resolve('scripts/worker-runtime/auth.mjs')}));b.onResolve({filter:/^(next\/(server|headers|navigation)(\.js)?|@cloudflare\/next-on-pages)$/},()=>({path:contextPath}))}}]})
 console.log('Bundled native API handlers:',files.length)
}
