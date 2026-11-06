"use client";
import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Download, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { FormError, TextareaField } from "@/components/forms/field";
import { PanelMessage } from "@/components/layout/panel-message";
import { usePermission } from "@/components/security/permission-provider";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/shadcn/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/shadcn/sheet";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Switch } from "@/components/shadcn/switch";
import { Label } from "@/components/shadcn/label";
import { describeApiError } from "@/lib/api/errors";
import { formatPaise } from "@/lib/currency/money";
import { fetchDocumentBlob, useFacultyDetail, useReviewFaculty, useSetDocumentVerified } from "../api/faculty";
import { REJECT_REASON_MAX, canDecide, formatFileSize, formatShortDate } from "../schemas/faculty";
import type { FacultyDetail, FacultyDocument } from "../types/faculty";
import { FacultyStatusBadge, PricingBadge } from "./faculty-table";

/**
 * Screen 27b: the tutor's onboarding application. Screening answers, the three documents
 * (preview, download, mark as verified), the subject cards with their price state, the
 * publish toggle, and Reject / Verify & publish.
 */
export function FacultyReviewDrawer({ facultyId, onClose }: { facultyId: string | undefined; onClose: () => void }) {
  const detail = useFacultyDetail(facultyId);
  return (
    <Sheet open={Boolean(facultyId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {detail.isPending ? (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>Tutor application</SheetTitle>
              <SheetDescription>Loading…</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 p-4" role="status" aria-label="Loading">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </>
        ) : detail.isError ? (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>Tutor application</SheetTitle>
            </SheetHeader>
            <PanelMessage onRetry={() => void detail.refetch()}>
              {describeApiError(detail.error, "view tutors").message || "The application could not be loaded."}
            </PanelMessage>
          </>
        ) : (
          <ReviewView key={detail.data.id} detail={detail.data} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b p-4" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value ?? "—"}</dd>
    </div>
  );
}

export function ReviewView({ detail, onClose }: { detail: FacultyDetail; onClose: () => void }) {
  const canApprove = usePermission("faculty.approve");
  const canViewDocuments = usePermission("faculty.documents");
  const review = useReviewFaculty(detail.id);
  const [publish, setPublish] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [error, setError] = useState<string>();
  const decidable = canApprove && canDecide(detail);
  const verified = detail.documents.filter((d) => d.isVerified).length;

  const decide = async (decision: "approve" | "reject") => {
    setError(undefined);
    if (decision === "reject") {
      const trimmed = reason.trim();
      if (!trimmed) return setReasonError("Give the tutor a reason; it is included in the email.");
      if (trimmed.length > REJECT_REASON_MAX) return setReasonError(`Keep the reason under ${REJECT_REASON_MAX} characters.`);
    }
    try {
      await review.mutateAsync({
        decision,
        publish: decision === "approve" ? publish : false,
        expectedRevision: detail.revision,
        ...(decision === "reject" ? { reason: reason.trim() } : {}),
      });
      setRejecting(false);
      toast.success(
        decision === "approve"
          ? `${detail.fullName} is verified${publish ? " and will be published" : ""}`
          : `${detail.fullName}'s application was rejected`,
        {
          description:
            decision === "approve"
              ? "Set a price for each subject card in Pricing; the tutor can sign in once every card is priced."
              : "The tutor has been emailed the reason.",
        },
      );
    } catch (err) {
      const described = describeApiError(err, "review tutors");
      if (decision === "reject" && described.fields.reason) setReasonError(described.fields.reason);
      setError(described.message);
    }
  };

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle className="text-lg">{detail.fullName}</SheetTitle>
        <SheetDescription>
          {[detail.applicationReference, detail.email].filter(Boolean).join(" · ")}
        </SheetDescription>
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <FacultyStatusBadge status={detail.status} />
          <PricingBadge status={detail.pricing} />
        </div>
      </SheetHeader>

      <Section title="Screening">
        <dl className="grid grid-cols-2 gap-3">
          <Fact label="Highest qualification" value={detail.screening.highestQualification} />
          <Fact label="Studied at" value={detail.screening.studiedAt} />
          <Fact label="Teaching experience" value={detail.screening.teachingExperience?.label} />
          <Fact label="Offline classes" value={detail.screening.offersOfflineClasses ? "Yes" : "No"} />
          <Fact label="City" value={detail.city} />
          <Fact label="Mobile" value={detail.mobileNumber} />
          <Fact label="Submitted" value={detail.submittedAt ? formatShortDate(detail.submittedAt) : formatShortDate(detail.appliedAt)} />
        </dl>
      </Section>

      <Section title="Documents" action={<span className="text-xs text-muted-foreground">{verified} of {detail.documents.length} verified</span>}>
        {detail.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {detail.documents.map((doc) => (
              <DocumentRow key={doc.id} facultyId={detail.id} doc={doc} canView={canViewDocuments} canVerify={canApprove && detail.approvalStatus !== "rejected"} />
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Subjects (${detail.subjects.length})`}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {detail.subjects.map((s) => (
            <li key={s.assignmentId} className="flex flex-col gap-0.5 rounded-md border p-3">
              <span className="text-sm font-semibold">{s.subject}</span>
              <span className="text-xs break-words text-muted-foreground">{s.pathLabel}</span>
              <span className="pt-1 text-xs">
                {s.sessionPricePaise === null ? (
                  <Badge variant="warning">No price yet</Badge>
                ) : (
                  <>
                    {formatPaise(s.sessionPricePaise)} per session
                    {s.studentPaysPaise !== null && <span className="text-muted-foreground"> · student pays {formatPaise(s.studentPaysPaise)}</span>}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        {detail.pricing === "declined" && (
          <p className="text-sm text-error-foreground">The tutor declined these prices. Update them in Pricing to ask again.</p>
        )}
      </Section>

      {detail.approvalStatus === "rejected" && detail.rejectionReason && (
        <Section title="Rejection reason">
          <p className="text-sm whitespace-pre-wrap">{detail.rejectionReason}</p>
        </Section>
      )}

      {decidable && (
        <div className="flex items-center justify-between gap-3 p-4">
          <Label htmlFor="publish-on-verify" className="font-normal">
            Publish profile to discovery once verified
          </Label>
          <Switch id="publish-on-verify" checked={publish} onCheckedChange={setPublish} />
        </div>
      )}

      <div className="px-4">
        <FormError message={error} />
      </div>

      <SheetFooter className="flex-row justify-end border-t">
        {decidable ? (
          <>
            <Button variant="outline" onClick={() => { setReason(""); setReasonError(undefined); setRejecting(true); }} disabled={review.isPending}>
              Reject
            </Button>
            <Button onClick={() => void decide("approve")} disabled={review.isPending}>
              <CheckCircle2 aria-hidden="true" />
              {review.isPending && !rejecting ? "Saving…" : "Verify & publish"}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </SheetFooter>

      <ConfirmDialog
        open={rejecting}
        title={`Reject ${detail.fullName}?`}
        description="The tutor is emailed this reason and cannot sign in."
        confirmLabel="Reject application"
        destructive
        pending={review.isPending}
        onCancel={() => setRejecting(false)}
        onConfirm={() => void decide("reject")}
      >
        <TextareaField
          label="Reason"
          required
          maxLength={REJECT_REASON_MAX}
          value={reason}
          error={reasonError}
          onChange={(e) => {
            setReason(e.target.value);
            setReasonError(undefined);
          }}
        />
      </ConfirmDialog>
    </>
  );
}

function DocumentRow({ facultyId, doc, canView, canVerify }: { facultyId: string; doc: FacultyDocument; canView: boolean; canVerify: boolean }) {
  const verify = useSetDocumentVerified(facultyId);
  const [preview, setPreview] = useState<string>();
  const [opening, setOpening] = useState(false);

  // Blob URLs hold the file in memory until revoked
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const open = async (download: boolean) => {
    setOpening(true);
    try {
      const url = await fetchDocumentBlob(facultyId, doc.id);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else setPreview(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The file could not be opened.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <FileText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold">{doc.label}</span>
        <span className="truncate text-xs text-muted-foreground" title={doc.fileName}>
          {doc.fileName} · {formatFileSize(doc.fileSize)}
          {doc.scanStatus === "pending" && " · not scanned"}
        </span>
      </div>
      {canView && (
        <div className="flex items-center gap-1">
          {doc.previewable && (
            <Button size="icon-sm" variant="ghost" aria-label={`Preview ${doc.label}`} disabled={opening} onClick={() => void open(false)}>
              <Eye />
            </Button>
          )}
          <Button size="icon-sm" variant="ghost" aria-label={`Download ${doc.label}`} disabled={opening} onClick={() => void open(true)}>
            <Download />
          </Button>
        </div>
      )}
      {doc.isVerified ? (
        <Badge variant="success">
          <CheckCircle2 aria-hidden="true" /> Verified
        </Badge>
      ) : canVerify ? (
        <Button
          size="sm"
          variant="outline"
          disabled={verify.isPending}
          onClick={() =>
            verify.mutate(
              { documentId: doc.id, isVerified: true },
              { onError: (err) => toast.error(describeApiError(err, "verify documents").message) },
            )
          }
        >
          Mark as verified
        </Button>
      ) : (
        <Badge variant="secondary">Not verified</Badge>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(next) => !next && setPreview(undefined)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{doc.label}</DialogTitle>
            <DialogDescription>{doc.fileName}</DialogDescription>
          </DialogHeader>
          {preview &&
            (doc.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={doc.label} className="max-h-[70vh] w-full rounded-md object-contain" />
            ) : (
              <iframe src={preview} title={doc.label} className="h-[70vh] w-full rounded-md border" />
            ))}
        </DialogContent>
      </Dialog>
    </li>
  );
}
