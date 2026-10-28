import { ExtensionPanel } from "@/components/ui/extension-panel";
export default function Live() {
  return (
    <ExtensionPanel
      title="Live session canvas"
      description="Inject a VideoAdapter and backend-issued session credentials. Authorize participant membership and administrator assistance on the backend before joining."
    />
  );
}
