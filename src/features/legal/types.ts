export const POLICY_TYPES = [
  "terms_of_use",
  "privacy_policy",
  "child_safety_policy",
  "student_terms",
] as const;
export type PolicyType = (typeof POLICY_TYPES)[number];

export const POLICY_LABELS: Record<PolicyType, string> = {
  terms_of_use: "Terms of Use",
  privacy_policy: "Privacy Policy",
  child_safety_policy: "Child Safety Policy",
  student_terms: "Student Terms",
};

export interface AdminPolicy {
  id: string;
  type: PolicyType;
  country: string;
  version: string;
  title: string;
  effectiveAt: string;
  sha256: string;
  isCurrent: boolean;
  createdAt: string;
}

export interface PolicyCoverage {
  country: string;
  name: string;
  missingTypes: PolicyType[];
}

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  defaultTimezone: string;
  guardianConsentAge: number;
}

export const policyFileUrl = (policyId: string): string =>
  `/api/v1/policies/${policyId}/file`;
