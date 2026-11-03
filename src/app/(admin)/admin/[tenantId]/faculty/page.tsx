import { FacultyPage } from "@/features/faculty/components/faculty-page";

// Faculty management (screen 27, LMS-78). Replaces the fixture directory that the
// generic [section] route rendered for /faculty.
export default async function Page({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <FacultyPage tenant={tenantId} />;
}
