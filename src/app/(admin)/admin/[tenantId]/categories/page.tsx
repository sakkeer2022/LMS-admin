import { CategoryTreePage } from "@/features/category-tree/components/category-tree-page";
import { CataloguePage } from "@/features/catalogue/components/catalogue-page";

// Categories & content (screen 28). The category tree (ADR-0005) replaces the typed
// catalogue tree, which stays visible read-only until the new tree is verified.
export default async function Page({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return (
    <CategoryTreePage
      tenant={tenantId}
      extraTabs={[{ id: "legacy", label: "Previous catalogue (read-only)", content: <CataloguePage tenant={tenantId} /> }]}
    />
  );
}
