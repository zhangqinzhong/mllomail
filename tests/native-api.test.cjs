const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
let runtime,temp;
before(async()=>{temp=fs.mkdtempSync(path.join(os.tmpdir(),'mllomail-native-test-'));const {buildApiRuntime}=await import('../scripts/build-api-runtime.mjs');await buildApiRuntime(temp);runtime=await import(path.join(temp,'api-runtime.mjs'))});
after(()=>fs.rmSync(temp,{recursive:true,force:true}));
function environment(secret='native-test-secret'){
 const sqlite=new DatabaseSync(':memory:',{enableDoubleQuotedStringLiterals:true});
 const journal=JSON.parse(fs.readFileSync('drizzle/meta/_journal.json','utf8'));
 for(const entry of journal.entries)sqlite.exec(fs.readFileSync('drizzle/'+entry.tag+'.sql','utf8'));
 sqlite.exec("INSERT INTO user(id,name,username) VALUES ('owner','Owner','owner'),('member','Member','member'); INSERT INTO role(id,name) VALUES ('admin-role','emperor'),('member-role','knight'); INSERT INTO user_role(user_id,role_id) VALUES ('owner','admin-role'),('member','member-role');");
 const DB={prepare(sql){const statement={params:[],bind(...params){this.params=params;return this},async all(){return {results:sqlite.prepare(sql).all(...this.params),success:true}},async raw(){const s=sqlite.prepare(sql);s.setReturnArrays(true);return s.all(...this.params)},async first(column){const row=sqlite.prepare(sql).get(...this.params);return column?row?.[column]??null:row??null},async run(){return {success:true,meta:sqlite.prepare(sql).run(...this.params)}}};return statement},async batch(statements){return Promise.all(statements.map(s=>s.all()))}};
 const kv=new Map([['TURNSTILE_ENABLED','true'],['TURNSTILE_SITE_KEY','public-test-key'],['TURNSTILE_SECRET_KEY','never-disclose-this-secret']]);
 return {AUTH_SECRET:secret,AUTH_TRUST_HOST:'true',DB,SITE_CONFIG:{get:async k=>Array.isArray(k)?new Map(k.map(key=>[key,kv.get(key)??null])):kv.get(k)??null,put:async(k,v)=>kv.set(k,v)}};
}
async function request(url,user,env,init={}){
 const {encode}=await import('next-auth/jwt');
 const cookie=user?'__Secure-authjs.session-token='+await encode({token:{id:user,name:user},secret:env.AUTH_SECRET,salt:'__Secure-authjs.session-token'}):'';
 return new Request('https://mail.example'+url,{...init,headers:{cookie,'X-User-Id':'owner',...init.headers}});
}
test('native session preserves Auth.js cookies and concurrent identity isolation',async()=>{
 const envA=environment('secret-a'),envB=environment('secret-b');
 const responses=await Promise.all([[envA,'owner'],[envB,'member']].map(async([env,user])=>runtime.serveApi(await request('/api/auth/session',user,env),env,{})));
 const sessions=await Promise.all(responses.map(r=>r.json()));
 assert.equal(sessions[0].user.id,'owner');assert.equal(sessions[1].user.id,'member');
 assert.equal(sessions[0].user.roles[0].name,'emperor');assert.equal(sessions[1].user.roles[0].name,'knight');
 for(const r of responses)assert.ok(r.headers.get('set-cookie')?.includes('__Secure-authjs.session-token='));
});
test('native API preserves anonymous, role and CSRF guards',async()=>{
 const env=environment();
 assert.equal((await runtime.serveApi(await request('/api/emails',null,env),env,{})).status,401);
 assert.equal((await runtime.serveApi(await request('/api/config','member',env,{method:'POST',body:'{}'}),env,{})).status,403);
 assert.equal((await runtime.serveApi(await request('/api/admin/users','member',env),env,{})).status,403);
 const res=await runtime.serveApi(await request('/api/auth/callback/credentials',null,env,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'username=owner&password=invalid-password'}),env,{});
 assert.equal(res.status,302);assert.match(res.headers.get('location'),/error=MissingCSRF/);
});
test('public login configuration exposes no secret and named routes outrank parameters',async()=>{
 const env=environment();
 const config=await runtime.serveApi(await request('/api/auth/ui-config',null,env),env,{});
 assert.deepEqual(await config.json(),{enabled:true,siteKey:'public-test-key'});
 const res=await runtime.serveApi(await request('/api/emails/send-permission','owner',env),env,{});
 assert.equal(res.status,200);assert.deepEqual(await res.json(),{canSend:false,error:'邮件发送服务未启用'});
});
test('static protected pages retain server redirects and current-role checks',async()=>{
 const env=environment();
 assert.equal((await runtime.authorizeStaticPage(await request('/zh-CN/moe',null,env),env,{})).status,307);
 const denied=await runtime.authorizeStaticPage(await request('/zh-CN/admin','member',env),env,{});assert.equal(new URL(denied.headers.get('location')).pathname,'/zh-CN/profile');
 assert.equal(await runtime.authorizeStaticPage(await request('/zh-CN/admin','owner',env),env,{}),null);
});
test('credentials login retains CSRF verification and issues a usable session',async()=>{
 const env=environment();await env.SITE_CONFIG.put('TURNSTILE_ENABLED','false');
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('test-password-only'+env.AUTH_SECRET))).toString('base64');
 await env.DB.prepare('UPDATE user SET password = ? WHERE id = ?').bind(hash,'owner').run();
 const csrfResponse=await runtime.serveApi(await request('/api/auth/csrf',null,env),env,{});
 const {csrfToken}=await csrfResponse.json();
 const cookie=csrfResponse.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
 const response=await runtime.serveApi(await request('/api/auth/callback/credentials',null,env,{method:'POST',headers:{cookie,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken,username:'owner',password:'test-password-only',callbackUrl:'https://mail.example/en'})}),env,{});
 assert.equal(response.status,302);assert.equal(response.headers.get('location'),'https://mail.example/en');
 const sessionCookie=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
 const session=await runtime.serveApi(await request('/api/auth/session',null,env,{headers:{cookie:sessionCookie}}),env,{});
 assert.equal((await session.json()).user.id,'owner');
});
test('shared page data stays token-authorized and revocation takes effect immediately',async()=>{
 const env=environment();const now=Date.now();
 await env.DB.prepare('INSERT INTO email(id,address,userId,created_at,expires_at) VALUES (?,?,?,?,?)').bind('shared-mail','test@example.test','owner',now,now+60000).run();
 await env.DB.prepare('INSERT INTO email_share(id,email_id,token,created_at,expires_at) VALUES (?,?,?,?,?)').bind('share-1','shared-mail','valid-test-share',now,now+60000).run();
 const invoke=async token=>runtime.serveApi(await request('/api/public-share?token='+token,null,env),env,{});
 assert.equal((await invoke('invalid')).status,404);
 const allowed=await invoke('valid-test-share');assert.equal(allowed.status,200);assert.equal((await allowed.json()).email.id,'shared-mail');
 await env.DB.prepare('DELETE FROM email_share WHERE id = ?').bind('share-1').run();
 assert.equal((await invoke('valid-test-share')).status,404);
});
test('provider metadata keeps original callback URLs without exposing credentials',async()=>{
 const env=environment();const response=await runtime.serveApi(await request('/api/auth/providers',null,env),env,{});const data=await response.json();
 assert.equal(data.google.callbackUrl,'https://mail.example/api/auth/callback/google');assert.equal(data.github.id,'github');assert.equal(data.credentials.type,'credentials');assert.equal(JSON.stringify(data).includes(env.AUTH_SECRET),false);
});
test('mailbox pagination preserves date format and isolates users',async()=>{
 const env=environment();const now=Date.now();
 for(let i=0;i<21;i++)await env.DB.prepare('INSERT INTO email(id,address,userId,created_at,expires_at) VALUES (?,?,?,?,?)').bind('mail-'+i,'mail'+i+'@example.test','owner',now-i,now+60000).run();
 await env.DB.prepare('INSERT INTO email(id,address,userId,created_at,expires_at) VALUES (?,?,?,?,?)').bind('private-member','member@example.test','member',now,now+60000).run();
 const first=await runtime.serveApi(await request('/api/emails','owner',env),env,{});const data=await first.json();assert.equal(data.total,21);assert.equal(data.emails.length,20);assert.equal(data.emails[0].createdAt,new Date(now).toISOString());
 assert.equal(data.emails.some(mail=>mail.id==='private-member'),false);
 const next=await runtime.serveApi(await request('/api/emails?cursor='+encodeURIComponent(data.nextCursor),'owner',env),env,{});const page=await next.json();assert.equal(page.emails.length,1);assert.equal(page.emails[0].id,'mail-20');assert.equal(page.nextCursor,null);
});
test('admin overview batches overrides within KV limits without exposing credentials',async()=>{
 const env=environment();
 for(let i=0;i<55;i++)await env.DB.prepare('INSERT INTO user(id,name,username,password) VALUES (?,?,?,?)').bind('bulk-'+i,'Bulk '+i,'bulk-'+i,'never-expose').run();
 await env.SITE_CONFIG.put('USER_MAX_EMAILS:member','42');
 const originalGet=env.SITE_CONFIG.get;const bulkSizes=[];
 env.SITE_CONFIG.get=async keys=>{if(Array.isArray(keys)){assert.ok(keys.length<=100);bulkSizes.push(keys.length)}return originalGet(keys)};
 const response=await runtime.serveApi(await request('/api/admin/users','owner',env),env,{});
 assert.equal(response.status,200);const body=await response.json();
 assert.equal(body.stats.totalUsers,57);assert.equal(body.stats.roleCounts.emperor,1);
 assert.equal(body.users.find(u=>u.id==='member').overrides.maxEmails,42);
 assert.equal(body.users[0].role,'emperor');assert.ok(bulkSizes.includes(100));
 assert.equal(JSON.stringify(body).includes('never-expose'),false);
});
