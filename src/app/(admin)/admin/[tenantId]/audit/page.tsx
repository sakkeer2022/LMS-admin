import { ExtensionPanel } from "@/components/ui/extension-panel";
export default function Page() {
  return (
    <ExtensionPanel
      title="Audit logs"
      description="Connect the audit.read protected endpoint. Do not log sensitive payloads in the browser."
    />
  );
}
