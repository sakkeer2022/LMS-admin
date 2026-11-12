"use client";
import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Download, Eye, FilePenLine, FileSignature, FileText } from "lucide-react";
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
import { fetchDocumentBlob, fetchSignatureBlob, useFacultyDetail, useReviewFaculty, useSetDocumentVerified } from "../api/faculty";
import { REASON_DIALOG, REJECT_REASON_MAX, canDecide, formatDateTime, formatFileSize, formatShortDate } from "../schemas/faculty";
import type { FacultyDetail, FacultyDocument } from "../types/faculty";
import { FacultyStatusBadge, PricingBadge, VerificationBadge } from "./faculty-table";

/**
 * Screen 27b: the tutor's onboarding application. Screening answers, the three required documents and
 * any additional ones (preview, download, mark as verified), the subject cards with their price state,
 * the signed price agreement, the publish toggle, and Reject / Request re-upload / Verify & publish.
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
  // The decision whose reason dialog is open: a final rejection or a request to correct and re-upload
  const [asking, setAsking] = useState<"reject" | "request_reupload">();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [error, setError] = useState<string>();
  const decidable = canApprove && canDecide(detail);
  const verified = detail.documents.filter((d) => d.isVerified).length;
  const required = detail.documents.filter((d) => d.required);
  const additional = detail.documents.filter((d) => !d.required);

  const ask = (decision: "reject" | "request_reupload") => {
    setReason("");
    setReasonError(undefined);
    setAsking(decision);
  };

  const decide = async (decision: "approve" | "reject" | "request_reupload") => {
    setError(undefined);
    if (decision !== "approve") {
      const trimmed = reason.trim();
      if (!trimmed) return setReasonError(REASON_DIALOG[decision].missing);
      if (trimmed.length > REJECT_REASON_MAX) return setReasonError(`Keep the reason under ${REJECT_REASON_MAX} characters.`);
    }
    try {
      const updated = await review.mutateAsync({
        decision,
        publish: decision === "approve" ? publish : false,
        expectedRevision: detail.revision,
        ...(decision !== "approve" ? { reason: reason.trim() } : {}),
      });
      setAsking(undefined);
      const messages = {
        approve: [
          `${detail.fullName} is verified${publish ? " and will be published" : ""}`,
          "Set a price for each subject card in Pricing; the tutor can sign in once every card is priced.",
        ],
        reject: [`${detail.fullName}'s application was rejected`, "The tutor has been emailed the reason."],
        request_reupload: [
          `Re-upload requested from ${detail.fullName}`,
          `The tutor has been emailed the reason and a link that expires ${updated.reupload ? formatDateTime(updated.reupload.expiresAt) : "soon"}.`,
        ],
      } as const;
      toast.success(messages[decision][0], { description: messages[decision][1] });
    } catch (err) {
      const described = describeApiError(err, "review tutors");
      if (decision !== "approve" && described.fields.reason) setReasonError(described.fields.reason);
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
          <VerificationBadge status={detail.verification} />
          <FacultyStatusBadge status={detail.status} />
          <PricingBadge status={detail.pricing} />
        </div>
      </SheetHeader>

      <Section title="Screening">
        <dl className="grid grid-cols-2 gap-3">
          <Fact label="Highest qualification" value={detail.screening.highestQualification} />
          <Fact label="Studied at" value={detail.screening.studiedAt} />
          <Fact label="Teaching experience" value={detail.screening.teachingExperience?.label} />
          <Fact
            label="Mode of teaching"
            value={detail.screening.teachingMode?.label ?? (detail.screening.offersOfflineClasses ? "Offers offline classes" : "Online")}
          />
          <Fact label="City" value={detail.city} />
          <Fact label="Mobile" value={detail.mobileNumber} />
          <Fact label="Submitted" value={detail.submittedAt ? formatShortDate(detail.submittedAt) : formatShortDate(detail.appliedAt)} />
        </dl>
      </Section>

      {detail.reupload && (
        <Section title="Re-upload requested">
          <div className="flex gap-3 rounded-md border border-warning-border bg-warning-subtle p-3 text-sm">
            <FilePenLine aria-hidden="true" className="size-5 shrink-0 text-warning-foreground" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="break-words whitespace-pre-wrap">{detail.reupload.reason}</p>
              <p className="text-xs text-muted-foreground">
                Sent {formatDateTime(detail.reupload.requestedAt)} ·{" "}
                {detail.reupload.expired ? (
                  <span className="font-semibold text-error-foreground">link expired {formatDateTime(detail.reupload.expiresAt)}</span>
                ) : (
                  <>link expires {formatDateTime(detail.reupload.expiresAt)}</>
                )}
              </p>
            </div>
          </div>
        </Section>
      )}

      <Section title="Documents" action={<span className="text-xs text-muted-foreground">{verified} of {detail.documents.length} verified</span>}>
        {detail.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2" aria-label="Required documents">
              {required.map((doc) => (
                <DocumentRow key={doc.id} facultyId={detail.id} doc={doc} canView={canViewDocuments} canVerify={canApprove && detail.approvalStatus !== "rejected"} />
              ))}
            </ul>
            {additional.length > 0 && (
              <>
                <h4 className="pt-1 text-xs font-semibold text-muted-foreground">Additional documents ({additional.length})</h4>
                <ul className="flex flex-col gap-2" aria-label="Additional documents">
                  {additional.map((doc) => (
                    <DocumentRow key={doc.id} facultyId={detail.id} doc={doc} canView={canViewDocuments} canVerify={canApprove && detail.approvalStatus !== "rejected"} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Section>

      <Section title={`Subjects (${detail.subjects.length})`}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {detail.subjects.map((s) => (
            <li key={s.assignmentId} className="flex flex-col gap-0.5 rounded-md border p-3">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {s.subject}
                {s.source === "profile" && s.status !== "approved" && (
                  <Badge variant={s.status === "rejected" ? "destructive" : "info"}>
                    {s.status === "rejected" ? "Rejected" : "Pending approval"}
                  </Badge>
                )}
              </span>
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
        {detail.consentSigned && <SignedAgreement facultyId={detail.id} decidedAt={detail.consentDecidedAt} canView={canViewDocuments} />}
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

      <SheetFooter className="flex-row flex-wrap justify-end border-t">
        {decidable ? (
          <>
            <Button variant="outline" className="text-destructive" onClick={() => ask("reject")} disabled={review.isPending}>
              Reject
            </Button>
            <Button variant="outline" onClick={() => ask("request_reupload")} disabled={review.isPending}>
              <FilePenLine aria-hidden="true" />
              Request re-upload
            </Button>
            <Button onClick={() => void decide("approve")} disabled={review.isPending}>
              <CheckCircle2 aria-hidden="true" />
              {review.isPending && !asking ? "Saving…" : "Verify & publish"}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </SheetFooter>

      <ConfirmDialog
        open={Boolean(asking)}
        title={asking ? REASON_DIALOG[asking].title(detail.fullName) : ""}
        description={asking ? REASON_DIALOG[asking].description : undefined}
        confirmLabel={asking ? REASON_DIALOG[asking].confirm : "Confirm"}
        destructive={asking === "reject"}
        pending={review.isPending}
        onCancel={() => setAsking(undefined)}
        onConfirm={() => asking && void decide(asking)}
      >
        <TextareaField
          label={asking === "request_reupload" ? "What should the tutor change?" : "Reason"}
          required
          placeholder={asking ? REASON_DIALOG[asking].placeholder : undefined}
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

/** The signature the tutor drew when they accepted their prices (opened through the API, audited). */
function SignedAgreement({ facultyId, decidedAt, canView }: { facultyId: string; decidedAt: string | null; canView: boolean }) {
  const [url, setUrl] = useState<string>();
  const [opening, setOpening] = useState(false);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <FileSignature aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold">Signed price agreement</span>
        {decidedAt && <span className="text-xs text-muted-foreground">Signed {formatDateTime(decidedAt)}</span>}
      </div>
      {canView && (
        <Button
          size="sm"
          variant="outline"
          disabled={opening}
          onClick={async () => {
            setOpening(true);
            try {
              setUrl(await fetchSignatureBlob(facultyId));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "The signature could not be opened.");
            } finally {
              setOpening(false);
            }
          }}
        >
          View signature
        </Button>
      )}
      <Dialog open={Boolean(url)} onOpenChange={(next) => !next && setUrl(undefined)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Signed price agreement</DialogTitle>
            <DialogDescription>{decidedAt ? `Signed ${formatDateTime(decidedAt)}` : "The tutor's signature"}</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url && <img src={url} alt="Tutor's signature" className="max-h-60 w-full rounded-md border bg-white object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
