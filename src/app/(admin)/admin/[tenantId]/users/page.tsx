import { UsersTable } from "@/features/users/components/users-table";
export default async function Page({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <UsersTable tenant={tenantId} />;
}
