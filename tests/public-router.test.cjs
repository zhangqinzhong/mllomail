const { test } = require('node:test');
const assert = require('node:assert/strict');
const routes = ['/en', '/zh-CN', '/en/privacy'];
test('public HTML and RSC resolve to different static files',async()=>{
 const { publicPagePath } = await import('../scripts/pages-public-router.mjs');
 assert.equal(publicPagePath(new Request('https://example.com/'),routes),'/en');
 assert.equal(publicPagePath(new Request('https://example.com/en?_rsc=x',{headers:{RSC:'1'}}),routes),'/en.rsc');
 assert.equal(publicPagePath(new Request('https://example.com/zh-CN/'),routes),'/zh-CN');
});
test('private pages, APIs, invalid locales and POST never enter static route',async()=>{
 const { publicPagePath } = await import('../scripts/pages-public-router.mjs');
 for(const path of ['/api/emails','/en/moe','/en/admin','/en/shared/token','/xx','/en/not-found'])
  assert.equal(publicPagePath(new Request('https://example.com'+path),routes),null);
 assert.equal(publicPagePath(new Request('https://example.com/en',{method:'POST'}),routes),null);
});
test('public asset lookup forwards neither cookies nor authorization',async()=>{
 const { servePublicPage }=await import('../scripts/pages-public-router.mjs');let seen;
 const env={ASSETS:{fetch:async r=>{seen=r;return new Response('static')}}};
 const r=await servePublicPage(new Request('https://example.com/en?_rsc=test',{headers:{RSC:'1',Cookie:'session=secret',Authorization:'Bearer secret'}}),env,routes);
 assert.equal(seen.url,'https://example.com/en.rsc');assert.equal(seen.headers.get('cookie'),null);
 assert.equal(seen.headers.get('authorization'),null);assert.match(r.headers.get('content-type'),/text\/x-component/);
 assert.match(r.headers.get('vary'),/RSC/);
});
