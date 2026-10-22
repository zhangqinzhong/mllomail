export function legacyPageRedirect(request) {
 const url=new URL(request.url)
 const match=/^\/(en|zh-CN|zh-TW|ja|ko)\/(admin\/users|shared\/message|shared)\/([^/]+)\/?$/.exec(url.pathname)
 if(!match)return null
 const [,locale,kind,raw]=match
 const value=decodeURIComponent(raw)
 url.pathname=`/${locale}/${kind==='admin/users'?'admin/user':kind==='shared/message'?'message':'share'}`
 url.search='';url.searchParams.set(kind==='admin/users'?'id':'token',value)
 return Response.redirect(url,307)
}
