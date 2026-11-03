import Link from "next/link";
import { Button } from "@/components/shadcn/button";

export default function Denied() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Access unavailable</h1>
      <p className="text-sm text-text-secondary">
        This portal is for administrators. Your account does not have the admin
        role. Contact your administrator.
      </p>
      <Button asChild className="self-start">
        <Link href="/login">Return to sign in</Link>
      </Button>
    </main>
  );
}
