const {test}=require('node:test');
const assert=require('node:assert/strict');
const route=import('../scripts/mail-poll-router.mjs');
const secret='cpu-test-secret-not-production';
async function req(token,query='summary=1') {
 const {encode}=await import('next-auth/jwt');
 const cookie=token ? '__Secure-authjs.session-token='+await encode({token,secret,salt:'__Secure-authjs.session-token',maxAge:token.expired ? -60 : 60}) : '';
 return new Request('https://example.com/api/emails/mailbox-1?'+query,{headers:{cookie,'X-User-Id':'forged-owner'}});
}
function env(role='knight',owner=true,rows=[]) {
 let reads=0;
 return {AUTH_SECRET:secret,reads:()=>reads,DB:{prepare(sql){return {bind(...params){reads++;return {all:async()=>({results:role ? [{name:role}] : []}),first:async()=>owner ? {id:'mailbox-1'} : null,sql,params}}}},batch:async()=>[{results:[{total:rows.length}]},{results:rows}]}};
}
test('poll rejects absent, expired and tampered JWTs despite identity header',async()=>{
 const {serveMailPoll}=await route;
 for(const r of [await req(null),await req({id:'user',expired:true}),new Request('https://example.com/api/emails/mailbox-1?summary=1',{headers:{cookie:'__Secure-authjs.session-token=tampered','X-User-Id':'user'}})]){
  const e=env();assert.equal((await serveMailPoll(r,e)).status,401);assert.equal(e.reads(),0);
 }
});
test('poll checks fresh roles and mailbox ownership',async()=>{
 const {serveMailPoll}=await route;
 assert.equal((await serveMailPoll(await req({id:'user'}),env('civilian'))).status,403);
 assert.equal((await serveMailPoll(await req({id:'user'}),env('knight',false))).status,403);
 assert.equal(await serveMailPoll(await req({id:'user'}),env(null)),null);
});
test('poll returns summary and compatible cursor without shared caching',async()=>{
 const {serveMailPoll}=await route;
 const rows=Array.from({length:21},(_,i)=>({id:'m'+i,subject:'test',received_at:100-i,sent_at:100-i}));
 const r=await serveMailPoll(await req({id:'user'}),env('knight',true,rows));
 const data=await r.json();assert.equal(data.messages.length,20);assert.equal(data.total,21);
 assert.deepEqual(JSON.parse(Buffer.from(data.nextCursor,'base64').toString()),{timestamp:81,id:'m19'});
 assert.equal(r.headers.get('Cache-Control'),'private, no-store');
});
test('API keys, sent mail and pagination keep original handler',async()=>{
 const {pollMailbox}=await route;
 for(const q of ['summary=1&type=sent','summary=1&cursor=abc'])assert.equal(pollMailbox(await req({id:'user'},q)),null);
 assert.equal(pollMailbox(new Request('https://example.com/api/emails/mailbox-1?summary=1',{headers:{'X-API-Key':'test'}})),null);
});

test('existing full-body clients also resolve without changing query semantics',async()=>{const {pollMailbox}=await route;assert.equal(pollMailbox(await req({id:'user'},'')),'mailbox-1')});

test('named email endpoints keep their own handlers',async()=>{const {pollMailbox}=await route;assert.equal(pollMailbox(new Request('https://example.com/api/emails/send-permission')),null)});
