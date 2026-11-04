export type ConsentStatus = "signed" | "missing" | "not_required";

export interface Guardian {
  fullName: string;
  relationship: string;
  mobileNumber: string;
  email: string;
  receivesReportsAndReceipts: boolean;
}

export interface AdminStudent {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  mobileNumber: string | null;
  isActive: boolean;
  country: string;
  dateOfBirth: string;
  age: number;
  isMinor: boolean;
  consentStatus: ConsentStatus;
  guardian: Guardian | null;
  registeredAt: string;
}

export interface ConsentRecord {
  id: string;
  policyId: string;
  policyTitle: string;
  policyVersion: string;
  country: string;
  signedAt: string;
  linkedAt: string;
  guardianName?: string | null;
  guardianRelationship?: string | null;
  signatureMode?: "draw" | "type";
  signedPdfSha256: string;
}

export interface AdminStudentDetail extends AdminStudent {
  learningProfile: {
    category: string;
    board: string | null;
    level: string;
    teachingLanguage: string;
    subjects: string[];
  };
  consent: ConsentRecord | null;
}

export interface StudentFilters {
  page: number;
  limit: number;
  q?: string;
  country?: string;
  minor?: "true" | "false";
  consent?: ConsentStatus;
}

export const CONSENT_LABELS: Record<ConsentStatus, string> = {
  signed: "Signed",
  missing: "Missing",
  not_required: "Not required",
};

export const RELATIONSHIP_LABELS: Record<string, string> = {
  father: "Father",
  mother: "Mother",
  legal_guardian: "Legal guardian",
  grandparent: "Grandparent",
  sibling: "Sibling",
  other: "Other",
};

/** `?a=b&c=d` with each value encoded (spaces as %20, which the API client's path check allows). */
export function toQuery(
  params: Record<string, string | number | undefined>,
): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  return parts.length ? `?${parts.join("&")}` : "";
}
