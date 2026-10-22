import {i18n} from "@/i18n/config"
import { AdminOverview } from "@/components/admin/admin-overview"


export const dynamic = "error"
export const dynamicParams = false
export function generateStaticParams(){return i18n.locales.map(locale=>({locale}))}


export default function AdminPage() {
  return <AdminOverview />
}
