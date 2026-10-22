import {getSharedEmail,getSharedEmailMessages,getSharedMessage} from '@/lib/shared-data'
export const runtime='edge'
// This transports the same token-authorized data previously rendered into HTML.
export async function GET(request:Request){
 const url=new URL(request.url);const token=url.searchParams.get('token')
 if(!token)return Response.json({error:'Not Found'},{status:404})
 if(url.searchParams.get('type')==='message'){
  const message=await getSharedMessage(token)
  return Response.json(message?{message}:{error:'Not Found'},{status:message?200:404,headers:{'Cache-Control':'private, no-store'}})
 }
 const email=await getSharedEmail(token)
 if(!email)return Response.json({error:'Not Found'},{status:404})
 const result=await getSharedEmailMessages(token)
 return Response.json({email,...result},{headers:{'Cache-Control':'private, no-store'}})
}
