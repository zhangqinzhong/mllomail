"use client"
import {useEffect,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {Loader2} from 'lucide-react'
import {AdminUserDetail} from '@/components/admin/admin-user-detail'
import {SharedEmailPageClient} from '../../[locale]/shared/[token]/page-client'
import {SharedMessagePageClient} from '../../[locale]/shared/message/[token]/page-client'
import {SharedErrorPage} from '@/components/emails/shared-error-page'
import type {SharedEmail,SharedMessage,SharedMessagesResult} from '@/lib/shared-data'

export function AdminUserQuery(){const id=useSearchParams().get('id');return id?<AdminUserDetail userId={id}/>:null}
export function SharedQuery({message=false}:{message?:boolean}){
 const token=useSearchParams().get('token')??''
 const [data,setData]=useState<({email:SharedEmail;message:SharedMessage}&SharedMessagesResult)|null>(null)
 const [failed,setFailed]=useState(false)
 useEffect(()=>{
  const abort=new AbortController();setData(null);setFailed(false)
  const url=new URL('/api/public-share',window.location.origin);url.searchParams.set('token',token);if(message)url.searchParams.set('type','message')
  fetch(url,{signal:abort.signal,cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Not Found');return r.json() as Promise<({email:SharedEmail;message:SharedMessage}&SharedMessagesResult)>}).then(setData).catch(()=>{if(!abort.signal.aborted)setFailed(true)})
  return ()=>abort.abort()
 },[token,message])
 if(failed)return <SharedErrorPage titleKey={message?'messageNotFound':'emailNotFound'} subtitleKey="linkExpired" errorKey="linkInvalid" descriptionKey="linkInvalidDescription" ctaTextKey="createOwnEmail"/>
 if(!data)return <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading"><Loader2 className="h-6 w-6 animate-spin"/></div>
 if(message)return <SharedMessagePageClient message={data.message}/>
 return <SharedEmailPageClient email={data.email} initialMessages={data.messages} initialNextCursor={data.nextCursor} initialTotal={data.total} token={token}/>
}
