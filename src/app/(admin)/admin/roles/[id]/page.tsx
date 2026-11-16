import { RoleEditor } from "@/features/roles/role-editor";

export const metadata = { title: "Edit role" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RoleEditor roleId={(await params).id} />;
}
