import {Suspense} from 'react'
import {SharedQuery} from '@/components/pages/query-pages'
import {i18n} from '@/i18n/config'
export const dynamic='error'
export const dynamicParams=false
export function generateStaticParams(){return i18n.locales.map(locale=>({locale}))}
export default function Page(){return <Suspense><SharedQuery /></Suspense>}
