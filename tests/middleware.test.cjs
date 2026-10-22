const {test} = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
function load(file, modules) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,require:n=>modules[n],Request,Response,Headers,URL});
 return exports;
}
const permissions = load('app/lib/permissions.ts', {});
function setup(session) {
 let calls = 0;
 const middleware = load('middleware.ts', {
  '@/lib/auth':{auth:async()=>{calls++;return session}},
  '@/lib/permissions':permissions,
  '@/i18n/config':{i18n:{locales:['en','zh-CN'],defaultLocale:'en'}},
  '@/lib/apiKey':{handleApiKeyAuth:async()=>new Response(null,{status:403})},
  'next/server':{NextResponse:{json:(data,{status})=>new Response(JSON.stringify(data),{status}), next:options=>options, rewrite:url=>url, redirect:url=>url}}
 }).middleware;
 return {middleware,calls:()=>calls};
}
test('spoofed identity cannot bypass login',async()=>{
 const {middleware}=setup(null);
 const r=await middleware(new Request('https://example.com/api/emails',{headers:{'X-User-Id':'owner'}}));
 assert.equal(r.status,401);
});
test('authenticated identity replaces caller header; auth runs once',async()=>{
 const ctx=setup({user:{id:'actual-user',roles:[{name:'knight'}]}});
 const r=await ctx.middleware(new Request('https://example.com/api/emails',{headers:{'X-User-Id':'owner'}}));
 assert.equal(r.request.headers.get('X-User-Id'),'actual-user');assert.equal(ctx.calls(),1);
});
test('civilian cannot read protected mail',async()=>{
 const ctx=setup({user:{id:'civilian',roles:[{name:'civilian'}]}});
 assert.equal((await ctx.middleware(new Request('https://example.com/api/emails'))).status,403);
});
test('configuration write still requires administrator permission',async()=>{
 const ctx=setup({user:{id:'knight',roles:[{name:'knight'}]}});
 assert.equal((await ctx.middleware(new Request('https://example.com/api/config',{method:'POST'}))).status,403);
});
test('auth endpoints receive no client-supplied internal identity',async()=>{
 const ctx=setup(null);
 const r=await ctx.middleware(new Request('https://example.com/api/auth/session',{headers:{'X-User-Id':'owner'}}));
 assert.equal(r.request.headers.get('X-User-Id'),null);assert.equal(ctx.calls(),0);
});
