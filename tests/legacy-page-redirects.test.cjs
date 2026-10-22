const {test}=require('node:test');const assert=require('node:assert/strict');
test('legacy detail links redirect within origin and preserve identifiers',async()=>{
 const {legacyPageRedirect}=await import('../scripts/legacy-page-redirects.mjs');
 for(const [path,target,key,value] of [['/zh-CN/admin/users/u-1','/zh-CN/admin/user','id','u-1'],['/en/shared/share-token','/en/share','token','share-token'],['/ja/shared/message/share-token','/ja/message','token','share-token']]){
  const res=legacyPageRedirect(new Request('https://mail.example'+path));const url=new URL(res.headers.get('location'));assert.equal(res.status,307);assert.equal(url.origin,'https://mail.example');assert.equal(url.pathname,target);assert.equal(url.searchParams.get(key),value);
 }
 assert.equal(legacyPageRedirect(new Request('https://mail.example/en/admin/users')),null);
});
