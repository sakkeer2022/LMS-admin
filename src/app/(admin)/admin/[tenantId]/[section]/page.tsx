import { notFound } from "next/navigation";
import { ExtensionPanel } from "@/components/ui/extension-panel";
import { FacultyDirectory } from "@/features/dashboard/faculty-directory";
const sections: Record<string, string> = {
  faculty: "Faculty",
  pricing: "Pricing",
  bookings: "Bookings",
  reviews: "Reviews",
  progress: "Progress Reports",
  payouts: "Payouts",
  settings: "Settings",
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { section } = await params;
  const { filter } = await searchParams;
  if (!sections[section]) notFound();
  if (section === "faculty") return <FacultyDirectory />;
  return (
    <ExtensionPanel
      title={sections[section]}
      description={`${filter ? `Requested queue: ${filter}. ` : ""}This workflow requires a backend adapter. No operational changes are available in this starter.`}
    />
  );
}
