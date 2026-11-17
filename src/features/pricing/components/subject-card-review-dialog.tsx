"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { FormError, TextareaField } from "@/components/forms/field";
import { describeApiError } from "@/lib/api/errors";
import { useReviewSubjectCard } from "@/lib/api/pricing";

const REASON_MAX = 1000;

/** The card a pricing row stands for, as both row kinds (price rule, "Not priced") can give it. */
export interface CardUnderReview {
  facultyId: string;
  cardId: string;
  tutor: string;
  subject: string;
  pathLabel: string;
  /** Approving needs an active tutor price */
  priced: boolean;
}

/**
 * Approve or reject a subject card the tutor requested from their profile (decided 2026-11-12).
 * Approving needs the tutor price first; the tutor then accepts the new price and the card opens
 * in their library. Rejecting needs a reason, which the tutor is emailed.
 */
export function SubjectCardReviewDialog({
  card,
  decision,
  onClose,
}: {
  card: CardUnderReview;
  decision: "approve" | "reject";
  onClose: () => void;
}) {
  const review = useReviewSubjectCard();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [error, setError] = useState<string>();
  const approving = decision === "approve";

  const confirm = async () => {
    setError(undefined);
    const trimmed = reason.trim();
    if (!approving) {
      if (!trimmed) return setReasonError("Tell the tutor why the subject card was not approved.");
      if (trimmed.length > REASON_MAX) return setReasonError(`Keep the reason under ${REASON_MAX} characters.`);
    }
    try {
      await review.mutateAsync({
        facultyId: card.facultyId,
        cardId: card.cardId,
        decision,
        ...(approving ? {} : { reason: trimmed }),
      });
      toast.success(approving ? `${card.subject} approved for ${card.tutor}` : `${card.subject} rejected`, {
        description: approving
          ? "The tutor has been emailed and will accept the new price on their next visit."
          : "The tutor has been emailed the reason.",
      });
      onClose();
    } catch (e) {
      setError(describeApiError(e, "review subject cards").message);
    }
  };

  return (
    <ConfirmDialog
      open
      title={approving ? "Approve this subject card?" : "Reject this subject card?"}
      description={`${card.tutor} · ${card.subject} (${card.pathLabel})`}
      confirmLabel={approving ? "Approve card" : "Reject card"}
      destructive={!approving}
      pending={review.isPending}
      onCancel={onClose}
      onConfirm={() => void confirm()}
    >
      {approving ? (
        <p className="text-sm text-muted-foreground">
          {card.priced
            ? "The card becomes active on the tutor's profile and in their library once they accept the price."
            : "Set the tutor's price for this subject first."}
        </p>
      ) : (
        <TextareaField
          label="Reason"
          required
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setReasonError(undefined);
          }}
          error={reasonError}
          hint="Emailed to the tutor. The slot is freed, so they can request another subject."
        />
      )}
      <FormError message={error} />
    </ConfirmDialog>
  );
}
