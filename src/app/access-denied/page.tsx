import { Typography } from "@/components/ui";
import { Link } from '@/components/ui/Link';
export default function Denied() {
  return (
    <main id="main">
      <Typography variant="h1">Access unavailable</Typography>
      <Typography>
        Your account needs a portal role and verified tenant membership. Contact
        your administrator.
      </Typography>
      <Link href="/login">Return to sign in</Link>
    </main>
  );
}
