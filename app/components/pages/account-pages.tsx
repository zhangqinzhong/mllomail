"use client"
import {useEffect,useState} from 'react'
import {useSession} from 'next-auth/react'
import {useLocale} from 'next-intl'
import {useRouter} from 'next/navigation'
import {Loader2} from 'lucide-react'
import {Header} from '@/components/layout/header'
import {ProfileCard} from '@/components/profile/profile-card'
import {ThreeColumnLayout} from '@/components/emails/three-column-layout'
import {NoPermissionDialog} from '@/components/no-permission-dialog'
import {ApiDocs} from '@/components/docs/api-docs'
import {LoginForm} from '@/components/auth/login-form'
import {SessionGate} from './session-gate'
import type {Locale} from '@/i18n/config'

export function MailPageContent(){
 const {data:session}=useSession()
 const allowed=session?.user.roles?.some(role=>['emperor','duke','knight'].includes(role.name))
 return <SessionGate><div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 h-screen"><div className="container mx-auto h-full px-4 lg:px-8 max-w-[1600px]"><Header/><main className="h-full"><ThreeColumnLayout/>{!allowed && <NoPermissionDialog/>}</main></div></div></SessionGate>
}
export function ProfilePageContent(){
 const {data:session}=useSession()
 return <SessionGate><div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"><div className="container mx-auto px-4 lg:px-8 max-w-[1600px]"><Header/><main className="pt-20 pb-5">{session?.user && <ProfileCard user={session.user}/>}</main></div></div></SessionGate>
}
export function DocsPageContent(){
 const {data:session}=useSession();const locale=useLocale() as Locale
 const [baseUrl,setBaseUrl]=useState('https://YOUR_DOMAIN')
 useEffect(()=>setBaseUrl(window.location.origin),[])
 const canCreateApiKey=Boolean(session?.user.roles?.some(role=>['emperor','duke'].includes(role.name)))
 return <SessionGate login><div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900"><Header/><ApiDocs baseUrl={baseUrl} canCreateApiKey={canCreateApiKey} locale={locale}/></div></SessionGate>
}
export function LoginPageContent(){
 const {status}=useSession();const locale=useLocale();const router=useRouter()
 const [config,setConfig]=useState<{enabled:boolean;siteKey:string}|null>(null)
 useEffect(()=>{if(status==='authenticated')router.replace(`/${locale}`)},[status,locale,router])
 useEffect(()=>{const abort=new AbortController();fetch('/api/auth/ui-config',{signal:abort.signal,cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Config unavailable');return r.json() as Promise<{enabled:boolean;siteKey:string}>}).then(setConfig).catch(()=>{});return ()=>abort.abort()},[])
 return <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">{config && status==='unauthenticated' ? <LoginForm turnstile={config}/> : <Loader2 className="h-6 w-6 animate-spin" role="status" aria-label="Loading"/>}</div>
}
