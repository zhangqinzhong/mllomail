import { DocsPageContent } from "@/components/pages/account-pages"
import {i18n} from "@/i18n/config"

export const dynamic = "error"
export const dynamicParams = false
export function generateStaticParams(){return i18n.locales.map(locale=>({locale}))}
export const metadata = {title:"API Docs | MlloMail",robots:{index:false,follow:false}}
export default function Page(){return <DocsPageContent/>}
