import { Typography } from "@/components/ui";
import { CategoryBrowser } from "@/features/discovery/components/category-browser";

// Discover: browse the category tree down to a bookable leaf (ADR-0005). Tutor search
// and slots attach here once the discovery and booking endpoints exist.
export default async function Page({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <Typography variant="h1">Find what to learn</Typography>
      <CategoryBrowser tenant={tenantId} />
    </div>
  );
}
