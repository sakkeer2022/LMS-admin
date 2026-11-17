"use client";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  GraduationCap,
  Megaphone,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CopyValue } from "@/components/feedback/copy-button";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/shadcn/button";
import { Kbd } from "@/components/shadcn/kbd";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/shadcn/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog";
import { Skeleton } from "@/components/shadcn/skeleton";
import { usePermission } from "@/components/security/permission-provider";
import { ApiError } from "@/lib/api/contracts";
import { useCountries } from "@/features/legal/api";
import { useDownloadConsent, useStudent, useViewConsent } from "./api";
import { Tip } from "@/components/feedback/tip";
import { PersonAvatar } from "@/components/feedback/person-avatar";
import { formatDate } from "@/lib/format/dates";
import { ConsentBadge, MinorBadge } from "./student-ui";
import {
  EDUCATION_LEVEL_LABELS,
  type AdminStudent,
  RELATIONSHIP_LABELS,
  referralText,
} from "./types";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-4 border-t border-border-subtle pt-6 first:border-0 first:pt-0"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-7 place-items-center rounded-md bg-accent">
          <Icon aria-hidden className="size-4 text-primary" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A label above its value, in a two-column grid from `sm` up. */
function Facts({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {children}
    </dl>
  );
}

function Fact({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  /** Spans both columns, for long values such as a file fingerprint */
  wide?: boolean;
}) {
  return (
    <div className={wide ? "flex flex-col gap-1 sm:col-span-2" : "flex flex-col gap-1"}>
      <dt className="text-xs font-semibold text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-text-secondary">{children}</p>
);

/** One student: who they are, learning profile, education, guardian and the signed consent with its viewer. */
export function StudentSheet({
  studentId,
  neighbours,
  onSelect,
  onClose,
}: {
  studentId: string | null;
  /** The students in the list behind the drawer, in order: for previous / next, and to name the header while one loads */
  neighbours: AdminStudent[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const query = useStudent(studentId);
  const download = useDownloadConsent();
  const view = useViewConsent();
  const [downloading, setDownloading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [preview, setPreview] = useState<string>();

  // Blob URLs hold the file in memory until revoked
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function viewConsent(): Promise<void> {
    if (!student) return;
    setViewing(true);
    try {
      setPreview(await view(student.id));
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "The consent could not be opened.",
      );
    } finally {
      setViewing(false);
    }
  }
  const canRead = usePermission("student.read");
  const student = query.data;

  async function fetchConsent(): Promise<void> {
    if (!student) return;
    setDownloading(true);
    try {
      await download(student.id, student.fullName);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "The consent could not be downloaded.",
      );
    } finally {
      setDownloading(false);
    }
  }

  const position = neighbours.findIndex((item) => item.id === studentId);
  const previous = position > 0 ? neighbours[position - 1].id : undefined;
  const next =
    position >= 0 && position < neighbours.length - 1
      ? neighbours[position + 1].id
      : undefined;
  const listedStudent = neighbours[position];
  // "k" and "j" step through the list, as in most inboxes
  useEffect(() => {
    if (!studentId) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "k" && previous) onSelect(previous);
      if (event.key === "j" && next) onSelect(next);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [studentId, previous, next, onSelect]);

  const countries = useCountries();
  const countryName = (code: string) =>
    countries.data?.find((item) => item.code === code)?.name ?? code;

  return (
    <Sheet
      open={studentId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="gap-3 border-b border-border-subtle bg-accent/40 p-5 pr-12">
          <div className="flex items-center gap-3">
            <PersonAvatar name={student?.fullName ?? listedStudent?.fullName ?? ""} size="lg" />
            <div className="flex min-w-0 flex-col">
              <SheetTitle className="truncate text-lg">
                {student?.fullName ?? listedStudent?.fullName ?? "Student"}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="min-w-0">
                  {student ? (
                    <CopyValue value={student.email} label="Email">
                      <span className="truncate">{student.email}</span>
                    </CopyValue>
                  ) : (
                    (listedStudent?.email ?? "Loading the student…")
                  )}
                </div>
              </SheetDescription>
            </div>
          </div>
          {student && (
            <div className="flex flex-wrap items-center gap-2">
              {student.isActive ? (
                <StatusBadge status="active">Active</StatusBadge>
              ) : (
                <StatusBadge status="inactive">Disabled</StatusBadge>
              )}
              {student.isMinor && <MinorBadge />}
              <ConsentBadge status={student.consentStatus} />
              {neighbours.length > 1 && (
                <span className="ml-auto flex items-center gap-1">
                  <Tip
                    label={
                      <span className="flex items-center gap-2">
                        Previous student <Kbd>K</Kbd>
                      </span>
                    }
                  >
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Previous student"
                      disabled={!previous}
                      onClick={() => previous && onSelect(previous)}
                    >
                      <ChevronUp />
                    </Button>
                  </Tip>
                  <Tip
                    label={
                      <span className="flex items-center gap-2">
                        Next student <Kbd>J</Kbd>
                      </span>
                    }
                  >
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Next student"
                      disabled={!next}
                      onClick={() => next && onSelect(next)}
                    >
                      <ChevronDown />
                    </Button>
                  </Tip>
                </span>
              )}
            </div>
          )}
        </SheetHeader>
        <div className="flex flex-col gap-6 p-5">
          {query.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3 text-sm text-error-foreground">
              The student could not be loaded. Check your connection and try again.
              <Button variant="outline" onClick={() => void query.refetch()}>
                Try again
              </Button>
            </div>
          ) : !student ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {student.consentStatus === "missing" && (
                <p
                  role="status"
                  className="flex items-start gap-2 rounded-md border border-warning-border/50 bg-warning-subtle p-3 text-sm text-warning-foreground"
                >
                  <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <strong className="font-semibold">Guardian consent missing.</strong>{" "}
                    {student.fullName} is a minor and has no signed Student Terms on record.
                  </span>
                </p>
              )}
              <Section title="Student" icon={UserRound}>
                <Facts>
                  <Fact label="Age">{student.age}</Fact>
                  <Fact label="Date of birth">
                    {formatDate(student.dateOfBirth)}
                  </Fact>
                  <Fact label="Country">{countryName(student.country)}</Fact>
                  <Fact label="City">{student.city || "—"}</Fact>
                  <Fact label="Mobile">
                    {student.mobileNumber ? (
                      <CopyValue value={student.mobileNumber} label="Mobile number" />
                    ) : (
                      "—"
                    )}
                  </Fact>
                  <Fact label="Registered">
                    {formatDate(student.registeredAt)}
                  </Fact>
                </Facts>
              </Section>

              <Section title="Learning profile" icon={BookOpen}>
                {student.learningProfile.interests.length ? (
                  <ul className="flex flex-col gap-2">
                    {student.learningProfile.interests.map((interest, i) => (
                      <li
                        key={i}
                        className="flex flex-col rounded-md border border-border-subtle bg-sunken px-3 py-2 text-sm"
                      >
                        <span className="text-xs text-text-secondary">
                          {interest.category}
                        </span>
                        <span className="font-medium">
                          {[interest.subject, interest.level, interest.board]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>None chosen.</Empty>
                )}
                {student.learningProfile.teachingLanguage && (
                  <Facts>
                    <Fact label="Teaching language">
                      {student.learningProfile.teachingLanguage}
                    </Fact>
                  </Facts>
                )}
              </Section>

              <Section title="Education" icon={GraduationCap}>
                {student.education ? (
                  <Facts>
                    {student.education.level && (
                      <Fact label="Currently">
                        {EDUCATION_LEVEL_LABELS[student.education.level] ??
                          student.education.level}
                      </Fact>
                    )}
                    {student.education.institutionName && (
                      <Fact label="School or college">
                        {student.education.institutionName}
                      </Fact>
                    )}
                    {student.education.detail && (
                      <Fact label="Class or course">
                        {student.education.detail}
                      </Fact>
                    )}
                    {student.education.stream && (
                      <Fact label="Stream">{student.education.stream}</Fact>
                    )}
                  </Facts>
                ) : (
                  <Empty>Not provided.</Empty>
                )}
              </Section>

              <Section title="How they found Amentorz" icon={Megaphone}>
                {student.referral ? (
                  <p className="text-sm">{referralText(student.referral)}</p>
                ) : (
                  <Empty>Not provided.</Empty>
                )}
              </Section>

              <Section title="Parent or guardian" icon={Users}>
                {student.guardian ? (
                  <Facts>
                    <Fact label="Name">{student.guardian.fullName}</Fact>
                    <Fact label="Relationship">
                      {RELATIONSHIP_LABELS[student.guardian.relationship] ??
                        student.guardian.relationship}
                    </Fact>
                    <Fact label="Mobile">
                      <CopyValue value={student.guardian.mobileNumber} label="Guardian mobile number" />
                    </Fact>
                    <Fact label="Email">
                      <CopyValue value={student.guardian.email} label="Guardian email" />
                    </Fact>
                    <Fact label="Reports and receipts" wide>
                      {student.guardian.receivesReportsAndReceipts
                        ? "Also sent to the guardian"
                        : "Student only"}
                    </Fact>
                  </Facts>
                ) : (
                  <Empty>
                    {student.isMinor
                      ? "No guardian contact is on record."
                      : "Not required for this student."}
                  </Empty>
                )}
              </Section>

              <Section title="Guardian consent" icon={ShieldCheck}>
                {student.consentStatus === "missing" && (
                  <Empty>Nothing to view or download until a guardian signs.</Empty>
                )}
                {student.consent ? (
                  <div className="flex flex-col gap-4 rounded-md border border-border-subtle bg-sunken p-4">
                    <Facts>
                      <Fact label="Document" wide>
                        {student.consent.policyTitle} v
                        {student.consent.policyVersion} (
                        {student.consent.country})
                      </Fact>
                      <Fact label="Signed">
                        {formatDate(student.consent.signedAt)}
                      </Fact>
                      <Fact label="Signed by">
                        {student.consent.guardianName ?? "—"}
                        {student.consent.guardianRelationship
                          ? ` (${RELATIONSHIP_LABELS[student.consent.guardianRelationship] ?? student.consent.guardianRelationship})`
                          : ""}
                      </Fact>
                      <Fact label="File fingerprint" wide>
                        <CopyValue value={student.consent.signedPdfSha256} label="File fingerprint">
                          <code className="font-mono text-xs break-all text-text-secondary">
                            {student.consent.signedPdfSha256}
                          </code>
                        </CopyValue>
                      </Fact>
                    </Facts>
                    {canRead && (
                      <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={viewing || downloading}
                            aria-busy={viewing || undefined}
                            onClick={() => void viewConsent()}
                          >
                            <Eye aria-hidden className="size-4" />
                            {viewing ? "Opening…" : "View consent"}
                          </Button>
                          <Button
                            variant="outline"
                            disabled={downloading || viewing}
                            aria-busy={downloading || undefined}
                            onClick={() => void fetchConsent()}
                          >
                            <Download aria-hidden className="size-4" />
                            {downloading ? "Preparing…" : "Download"}
                          </Button>
                        </div>
                        <p className="text-xs text-text-secondary">
                          Asks for your password, and viewing or downloading is
                          recorded in the audit log.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  student.consentStatus === "not_required" && (
                    <Empty>Not required for this student.</Empty>
                  )
                )}
              </Section>
            </>
          )}
        </div>
      </SheetContent>
      <Dialog
        open={Boolean(preview)}
        onOpenChange={(next) => !next && setPreview(undefined)}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Signed guardian consent</DialogTitle>
            <DialogDescription>{student?.fullName}</DialogDescription>
          </DialogHeader>
          {preview && (
            <iframe
              src={preview}
              title="Signed guardian consent"
              className="h-[70vh] w-full rounded-md border"
            />
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
