import { redirect } from "next/navigation";

// The audit.read screen is the Activity log
export default function Page() {
  redirect("/admin/activity");
}
