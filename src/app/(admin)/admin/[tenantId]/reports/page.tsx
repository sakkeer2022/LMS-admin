import { ExtensionPanel } from "@/components/ui/extension-panel";
export default function Page() {
  return (
    <ExtensionPanel
      title="Financial reports"
      description="CSV utilities and XLSX/PDF download adapters are available. Backend report endpoints must enforce authorization and audit exports."
    />
  );
}
