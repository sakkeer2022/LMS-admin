import { RecoveryFlow } from "@/features/auth/components/recovery-flow";

export const metadata = { title: "Reset your password" };

export default function Recovery() {
  return <RecoveryFlow portal="admin" />;
}
