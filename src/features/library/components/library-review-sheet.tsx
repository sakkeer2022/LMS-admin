"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { FormError, TextareaField } from "@/components/forms/field";
import { PanelMessage } from "@/components/layout/panel-message";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/shadcn/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/shadcn/sheet";
import { Skeleton } from "@/components/shadcn/skeleton";
import { describeApiError } from "@/lib/api/errors";
import { formatDateTime, formatFileSize } from "@/features/faculty/schemas/faculty";
import { fetchSubmissionFile, useReviewSubmission, useSubmission, type SubmissionDetail } from "../api/library";
import { SubmissionStatusBadge } from "./library-content-tab";

const REASON_MAX = 1000;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b p-4" aria-label={title}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** One submission: tutor, subject card, the content (preview or download), the live version it replaces, history, decision. */
export function LibraryReviewSheet({ submissionId, onClose }: { submissionId: string | undefined; onClose: () => void }) {
  const detail = useSubmission(submissionId);
  return (
    <Sheet open={Boolean(submissionId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {detail.isPending ? (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>Library submission</SheetTitle>
              <SheetDescription>Loading…</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 p-4" role="status" aria-label="Loading">
              {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </>
        ) : detail.isError ? (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>Library submission</SheetTitle>
            </SheetHeader>
            <PanelMessage onRetry={() => void detail.refetch()}>
              {describeApiError(detail.error, "review library content").message || "The submission could not be loaded."}
            </PanelMessage>
          </>
        ) : (
          <ReviewView key={detail.data.id} detail={detail.data} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ReviewView({ detail, onClose }: { detail: SubmissionDetail; onClose: () => void }) {
  const review = useReviewSubmission();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [error, setError] = useState<string>();

  const decide = async (status: "approved" | "rejected") => {
    setError(undefined);
    const trimmed = reason.trim();
    if (status === "rejected") {
      if (!trimmed) return setReasonError("Tell the tutor what to change.");
      if (trimmed.length > REASON_MAX) return setReasonError(`Keep the reason under ${REASON_MAX} characters.`);
    }
    try {
      await review.mutateAsync({ id: detail.id, status, ...(status === "rejected" ? { reason: trimmed } : {}) });
      toast.success(status === "approved" ? `“${detail.title}” approved` : `“${detail.title}” rejected`, {
        description: status === "approved"
          ? detail.isEdit ? "The edit replaces the earlier version." : "It is now part of the library."
          : "The tutor sees your reason in their library.",
      });
      onClose();
    } catch (e) {
      setError(describeApiError(e, "review library content").message);
    }
  };

  return (
    <>
      <SheetHeader className="border-b">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle>{detail.title}</SheetTitle>
          <SubmissionStatusBadge status={detail.status} />
          {detail.isEdit && <Badge variant="info">Edit of an approved resource</Badge>}
        </div>
        <SheetDescription>
          Submitted {formatDateTime(detail.submittedAt)} · version {detail.revision}
        </SheetDescription>
      </SheetHeader>

      <Section title="Tutor and subject card">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Tutor</dt>
            <dd className="font-medium">{detail.faculty.fullName}</dd>
            <dd className="truncate text-xs text-muted-foreground">{detail.faculty.email}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Subject card</dt>
            <dd className="font-medium">{detail.card.subject}</dd>
            <dd className="text-xs break-words text-muted-foreground">{detail.card.pathLabel}</dd>
          </div>
        </dl>
      </Section>

      <Section title={detail.isEdit ? "Submitted version" : "Content"}>
        <ContentView submissionId={detail.id} version="submitted" content={detail} />
      </Section>

      {detail.live && detail.status === "pending" && (
        <Section title={`Live version (version ${detail.live.revision})`}>
          <p className="text-xs text-muted-foreground">Students see this until the edit is approved.</p>
          <ContentView submissionId={detail.id} version="live" content={detail.live} />
        </Section>
      )}

      {detail.status !== "pending" && detail.reviewNotes && (
        <Section title="Review reason">
          <p className="text-sm whitespace-pre-wrap">{detail.reviewNotes}</p>
        </Section>
      )}

      {detail.history.length > 1 && (
        <Section title="History">
          <ol className="flex flex-col gap-2 text-sm">
            {detail.history.map((h) => (
              <li key={h.revision} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">Version {h.revision}</span>
                <span className="text-muted-foreground">{h.status} · {formatDateTime(h.reviewedAt ?? h.submittedAt)}</span>
                {h.reviewNotes && <span className="w-full text-xs text-muted-foreground">“{h.reviewNotes}”</span>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {detail.status === "pending" && (
        <SheetFooter className="sticky bottom-0 border-t bg-background">
          {rejecting && (
            <TextareaField
              label="Reason for the tutor"
              required
              rows={3}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(e) => { setReason(e.target.value); setReasonError(undefined); }}
              error={reasonError}
              hint="Shown to the tutor in their library."
            />
          )}
          <FormError message={error} />
          <div className="flex flex-wrap justify-end gap-2">
            {rejecting ? (
              <>
                <Button variant="outline" onClick={() => setRejecting(false)} disabled={review.isPending}>Cancel</Button>
                <Button variant="destructive" onClick={() => void decide("rejected")} disabled={review.isPending}>
                  {review.isPending ? "Rejecting…" : "Reject"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setRejecting(true)} disabled={review.isPending}>Reject</Button>
                <Button onClick={() => void decide("approved")} disabled={review.isPending}>
                  {review.isPending ? "Approving…" : "Approve"}
                </Button>
              </>
            )}
          </div>
        </SheetFooter>
      )}
    </>
  );
}

type Content = Pick<SubmissionDetail, "kind" | "title" | "description" | "body" | "file">;

function ContentView({ submissionId, version, content }: { submissionId: string; version: "submitted" | "live"; content: Content }) {
  return (
    <div className="flex flex-col gap-3">
      {version === "live" && <p className="text-sm font-medium">{content.title}</p>}
      {content.description && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{content.description}</p>}
      {content.kind === "note" ? (
        <div className="max-h-80 overflow-y-auto rounded-md border bg-sunken p-3 text-sm whitespace-pre-wrap">{content.body}</div>
      ) : content.file ? (
        <FileRow submissionId={submissionId} version={version} file={content.file} />
      ) : null}
    </div>
  );
}

function FileRow({ submissionId, version, file }: { submissionId: string; version: "submitted" | "live"; file: NonNullable<Content["file"]> }) {
  const [preview, setPreview] = useState<string>();
  const [opening, setOpening] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const open = async (download: boolean) => {
    setOpening(true);
    try {
      const url = await fetchSubmissionFile(submissionId, version);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
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
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <FileText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold" title={file.name}>{file.name}</span>
        <span className="text-xs text-muted-foreground">{formatFileSize(file.size)} · not scanned</span>
      </div>
      <div className="flex items-center gap-1">
        {file.previewable && (
          <Button size="icon-sm" variant="ghost" aria-label={`Preview ${file.name}`} disabled={opening} onClick={() => void open(false)}>
            <Eye />
          </Button>
        )}
        <Button size="icon-sm" variant="ghost" aria-label={`Download ${file.name}`} disabled={opening} onClick={() => void open(true)}>
          <Download />
        </Button>
      </div>
      <Dialog open={Boolean(preview)} onOpenChange={(next) => !next && setPreview(undefined)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{file.name}</DialogTitle>
            <DialogDescription>{formatFileSize(file.size)}</DialogDescription>
          </DialogHeader>
          {preview &&
            (file.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={file.name} className="max-h-[70vh] w-full rounded-md object-contain" />
            ) : (
              <iframe src={preview} title={file.name} className="h-[70vh] w-full rounded-md border" />
            ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
