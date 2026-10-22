const {test}=require('node:test');const assert=require('node:assert/strict');
const ts=require('typescript');const fs=require('node:fs');const vm=require('node:vm');
function route(){
 let query;
 const row={id:'message',fromAddress:'sender',toAddress:'recipient',subject:'subject',content:'large text',html:'large html',receivedAt:new Date(0),sentAt:null};
 const db={query:{emails:{findFirst:async()=>({id:'mailbox'})},messages:{findMany:async q=>{query=q;return [{...row,...(q.columns?{content:undefined,html:undefined}:{})}]}}},select:()=>({from:()=>({where:async()=>[{count:1}]})})};
 const noop=()=>({});const exports={};
 const modules={'next/server':{NextResponse:{json:x=>Response.json(x)}},'@/lib/db':{createDb:()=>db},'@/lib/schema':{emails:{},messages:{}},'drizzle-orm':{eq:noop,and:noop,lt:noop,or:noop,sql:noop,ne:noop,isNull:noop},'@/lib/cursor':{},'@/lib/apiKey':{getUserId:async()=>'verified-user'},'@/lib/send-permissions':{checkBasicSendPermission:async()=>({canSend:true})}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/emails/[id]/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>modules[n],Response,URL,Date,console});
 return {get:exports.GET,query:()=>query};
}
test('summary opt-in skips bodies at the database and response',async()=>{
 const r=route();const res=await r.get(new Request('https://example.com/api/emails/mailbox?summary=1'),{params:Promise.resolve({id:'mailbox'})});const b=await res.json();
 assert.equal(r.query().columns.html,false);assert.equal(r.query().columns.content,false);assert.equal(b.messages[0].html,undefined);assert.equal(b.messages[0].subject,'subject');assert.equal(b.total,1);
});
test('default API retains full messages for existing clients',async()=>{
 const r=route();const res=await r.get(new Request('https://example.com/api/emails/mailbox'),{params:Promise.resolve({id:'mailbox'})});const b=await res.json();
 assert.equal(r.query().columns,undefined);assert.equal(b.messages[0].html,'large html');assert.equal(b.messages[0].content,'large text');
});
