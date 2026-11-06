import { notFound } from "next/navigation";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

const sections: Record<string, string> = {
  bookings: "Bookings",
  reviews: "Reviews",
  progress: "Progress Reports",
  payouts: "Payouts",
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
  return (
    <>
      <PageHeader title={sections[section]} />
      <EmptyState
        title="Not available yet"
        description={`${filter ? `Requested queue: ${filter}. ` : ""}This workflow needs a backend service that has not been connected.`}
      />
    </>
  );
}
