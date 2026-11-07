"use client";
import { Download, FileCheck2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/shadcn/sheet";
import { Skeleton } from "@/components/shadcn/skeleton";
import { usePermission } from "@/components/security/permission-provider";
import { ApiError } from "@/lib/api/contracts";
import { useDownloadConsent, useStudent } from "./api";
import { ConsentBadge, formatDate } from "./students-page";
import {
  EDUCATION_LEVEL_LABELS,
  RELATIONSHIP_LABELS,
  referralText,
} from "./types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 border-t border-border-subtle pt-5"
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 text-sm">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** One student: details, learning profile, guardian contact and the signed consent with its download. */
export function StudentSheet({
  studentId,
  onClose,
}: {
  studentId: string | null;
  onClose: () => void;
}) {
  const query = useStudent(studentId);
  const download = useDownloadConsent();
  const [downloading, setDownloading] = useState(false);
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

  return (
    <Sheet
      open={studentId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-4">
          <SheetTitle>{student?.fullName ?? "Student"}</SheetTitle>
          <SheetDescription>
            {student?.email ?? "Loading the student…"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-6">
          {query.isError ? (
            <p role="alert" className="text-sm text-error-foreground">
              The student could not be loaded.
            </p>
          ) : !student ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <dl className="flex flex-col gap-2">
                <Fact label="Age">
                  {student.age}
                  {student.isMinor && (
                    <Badge variant="info" className="ml-2">
                      Minor
                    </Badge>
                  )}
                </Fact>
                <Fact label="Date of birth">
                  {formatDate(student.dateOfBirth)}
                </Fact>
                <Fact label="Country">{student.country}</Fact>
                <Fact label="Mobile">{student.mobileNumber ?? "—"}</Fact>
                <Fact label="Account">
                  {student.isActive ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </Fact>
                <Fact label="Registered">
                  {formatDate(student.registeredAt)}
                </Fact>
              </dl>

              <Section title="Learning profile">
                {student.learningProfile.interests.length ? (
                  <ul className="flex flex-col gap-2">
                    {student.learningProfile.interests.map((interest, i) => (
                      <li
                        key={i}
                        className="flex flex-col rounded-md bg-sunken px-3 py-2 text-sm"
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
                  <p className="text-sm text-text-secondary">None chosen.</p>
                )}
                {student.learningProfile.teachingLanguage && (
                  <dl className="mt-2 flex flex-col gap-2">
                    <Fact label="Teaching language">
                      {student.learningProfile.teachingLanguage}
                    </Fact>
                  </dl>
                )}
              </Section>

              <Section title="Education">
                {student.education ? (
                  <dl className="flex flex-col gap-2">
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
                  </dl>
                ) : (
                  <p className="text-sm text-text-secondary">Not provided.</p>
                )}
              </Section>

              <Section title="How they found Amentorz">
                <p className="text-sm">
                  {student.referral ? (
                    referralText(student.referral)
                  ) : (
                    <span className="text-text-secondary">Not provided.</span>
                  )}
                </p>
              </Section>

              <Section title="Parent or guardian">
                {student.guardian ? (
                  <dl className="flex flex-col gap-2">
                    <Fact label="Name">{student.guardian.fullName}</Fact>
                    <Fact label="Relationship">
                      {RELATIONSHIP_LABELS[student.guardian.relationship] ??
                        student.guardian.relationship}
                    </Fact>
                    <Fact label="Mobile">{student.guardian.mobileNumber}</Fact>
                    <Fact label="Email">{student.guardian.email}</Fact>
                    <Fact label="Reports and receipts">
                      {student.guardian.receivesReportsAndReceipts
                        ? "Also sent to the guardian"
                        : "Student only"}
                    </Fact>
                  </dl>
                ) : (
                  <p className="text-sm text-text-secondary">
                    {student.isMinor
                      ? "No guardian contact is on record."
                      : "Not required for this student."}
                  </p>
                )}
              </Section>

              <Section title="Guardian consent">
                <div className="flex items-center gap-2">
                  <ConsentBadge status={student.consentStatus} />
                  {student.consentStatus === "missing" && (
                    <span className="text-xs text-warning-foreground">
                      This minor has no signed consent on record.
                    </span>
                  )}
                </div>
                {student.consent && (
                  <>
                    <dl className="flex flex-col gap-2">
                      <Fact label="Document">
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
                      <Fact label="File fingerprint">
                        <code className="text-xs break-all">
                          {student.consent.signedPdfSha256}
                        </code>
                      </Fact>
                    </dl>
                    {canRead && (
                      <div className="flex flex-col gap-1">
                        <Button
                          className="w-fit"
                          disabled={downloading}
                          aria-busy={downloading || undefined}
                          onClick={() => void fetchConsent()}
                        >
                          {student.consent ? (
                            <Download aria-hidden className="size-4" />
                          ) : (
                            <FileCheck2 aria-hidden className="size-4" />
                          )}
                          {downloading
                            ? "Preparing…"
                            : "Download signed consent"}
                        </Button>
                        <p className="text-xs text-text-secondary">
                          Asks for your password, and the download is recorded
                          in the audit log.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </Section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
