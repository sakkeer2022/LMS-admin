import { ExtensionPanel } from "@/components/ui/extension-panel";
export default function Page() {
  return (
    <ExtensionPanel
      title="Availability calendar"
      description="Store UTC instants and an IANA time zone. Slot creation requires a backend scheduling contract."
    />
  );
}
