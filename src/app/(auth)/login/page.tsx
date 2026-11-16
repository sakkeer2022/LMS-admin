import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata = { title: "Admin login" };

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  // A destination means the person was sent here by an expired session, so renewing it is tried first
  const { redirect } = await searchParams;
  return <AuthForm restoring={Boolean(redirect)} />;
}
