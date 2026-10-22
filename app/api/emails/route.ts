import {getRequestContext} from '@cloudflare/next-on-pages'
import {encodeCursor,decodeCursor} from '@/lib/cursor'
import {getUserId} from '@/lib/apiKey'
export const runtime='edge'
const PAGE_SIZE=20
interface MailboxRow {id:string;address:string;userId:string;created_at:number;expires_at:number}
export async function GET(request:Request){
 const userId=await getUserId()
 try {
  const db=getRequestContext().env.DB;const now=Date.now()
  const cursor=new URL(request.url).searchParams.get('cursor')
  const where='userId = ? AND expires_at > ?'
  const parameters:(string|number)[]=[userId!,now]
  let pageCondition=''
  if(cursor){const {timestamp,id}=decodeCursor(cursor);pageCondition=' AND (created_at < ? OR (created_at = ? AND id < ?))';parameters.push(timestamp,timestamp,id)}
  const [total,rows]=await db.batch<MailboxRow & {total:number}>([
   db.prepare('SELECT count(*) AS total FROM email WHERE '+where).bind(userId!,now),
   db.prepare('SELECT id,address,userId,created_at,expires_at FROM email WHERE '+where+pageCondition+' ORDER BY created_at DESC,id DESC LIMIT ?').bind(...parameters,PAGE_SIZE+1),
  ])
  const results=rows.results
  const hasMore=results.length>PAGE_SIZE;const page=results.slice(0,PAGE_SIZE)
  return Response.json({emails:page.map(row=>({id:row.id,address:row.address,userId:row.userId,createdAt:new Date(row.created_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString()})),nextCursor:hasMore?encodeCursor(page[PAGE_SIZE-1].created_at,page[PAGE_SIZE-1].id):null,total:Number(total.results[0].total)})
 }catch(error){console.error('Failed to fetch user emails:',error);return Response.json({error:'Failed to fetch emails'},{status:500})}
}
