import { AdminUserDetail } from "@/components/admin/admin-user-detail"

export const runtime = "edge"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AdminUserDetail userId={id} />
}
