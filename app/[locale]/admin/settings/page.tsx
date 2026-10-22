import {i18n} from "@/i18n/config"
import { AdminSettings } from "@/components/admin/admin-settings"


export const dynamic = "error"
export const dynamicParams = false
export function generateStaticParams(){return i18n.locales.map(locale=>({locale}))}


export default function AdminSettingsPage() {
  return <AdminSettings />
}
