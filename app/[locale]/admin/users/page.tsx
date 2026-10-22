import {i18n} from "@/i18n/config"
import { AdminDashboard } from "@/components/admin/admin-dashboard"


export const dynamic = "error"
export const dynamicParams = false
export function generateStaticParams(){return i18n.locales.map(locale=>({locale}))}


export default function AdminUsersPage() {
  return <AdminDashboard />
}
