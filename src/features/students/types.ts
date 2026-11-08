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
  /** How the student heard about Amentorz (optional at registration) */
  referral: { code: string; name: string; other: string | null } | null;
  /** Optional education details; any field may be missing */
  education: {
    level: string | null;
    institutionName: string | null;
    detail: string | null;
  } | null;
  learningProfile: {
    teachingLanguage: string | null;
    /** One per chosen offering, any mix of branches */
    interests: {
      category: string;
      board: string | null;
      level: string | null;
      subject: string;
    }[];
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

export const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  school: "School",
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate",
  working: "Working professional",
  other: "Other",
};

/** "Other: a poster at my tuition centre" for the free-text option, otherwise the option's name. */
export function referralText(referral: NonNullable<AdminStudentDetail["referral"]>) {
  return referral.other ? `${referral.name}: ${referral.other}` : referral.name;
}

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
