import { AlertTriangle, CheckCircle2, Minus } from "lucide-react";
import { Badge } from "@/components/shadcn/badge";
import { StatusBadge, type StatusTone } from "@/components/feedback/status-badge";
import { Tip } from "@/components/feedback/tip";
import { CONSENT_LABELS, type ConsentStatus } from "./types";

/** "Minor", with what it means on hover. */
export function MinorBadge() {
  return (
    <Tip label="Under the age that needs a guardian's consent">
      <Badge variant="info" className="cursor-help">
        Minor
      </Badge>
    </Tip>
  );
}

/** Guardian consent: the label always carries the meaning, the icon and colour only reinforce it. */
export function ConsentBadge({ status }: { status: ConsentStatus }) {
  const Icon =
    status === "signed"
      ? CheckCircle2
      : status === "missing"
        ? AlertTriangle
        : Minus;
  const tone: StatusTone =
    status === "signed" ? "approved" : status === "missing" ? "pending" : "inactive";
  return (
    <StatusBadge status={tone}>
      <Icon aria-hidden />
      {CONSENT_LABELS[status]}
    </StatusBadge>
  );
}
