"use client"
import { useEffect, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export function SessionGate({children, admin=false, login=false}: {children:ReactNode;admin?:boolean;login?:boolean}) {
  const {data:session,status}=useSession()
  const locale=useLocale()
  const router=useRouter()
  const allowed=Boolean(session?.user?.id && (!admin || session.user.roles?.[0]?.name==='emperor'))
  useEffect(()=>{
    if(status==='unauthenticated')router.replace(`/${locale}${admin || login ? '/login' : ''}`)
    else if(status==='authenticated' && !allowed)router.replace(`/${locale}/profile`)
  },[status,allowed,admin,login,locale,router])
  if(!allowed)return <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Loading"><Loader2 className="h-6 w-6 animate-spin" /></div>
  return children
}
