import { Link } from '@/components/ui/Link';
import { AuthForm } from "@/features/auth/components/auth-form";
export default function Login() {
  return (
    <>
      <AuthForm />
      <Link href="/recovery">Recover access</Link>
    </>
  );
}
