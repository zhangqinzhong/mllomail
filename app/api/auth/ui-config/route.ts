import {getTurnstileConfig} from '@/lib/turnstile'
export const runtime='edge'
export async function GET(){
 const {enabled,siteKey}=await getTurnstileConfig()
 return Response.json({enabled,siteKey},{headers:{'Cache-Control':'no-store'}})
}
