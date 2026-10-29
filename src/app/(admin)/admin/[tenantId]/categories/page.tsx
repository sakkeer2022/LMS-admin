import { CataloguePage } from "@/features/catalogue/components/catalogue-page";
export default async function Page({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <CataloguePage tenant={tenantId} />;
}
