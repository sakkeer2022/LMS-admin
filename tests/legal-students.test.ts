import { describe, expect, it } from "vitest";
import { ApiError } from "../src/lib/api/contracts";
import {
  isReauthRequired,
  REAUTH_REQUIRED_MESSAGE,
} from "../src/lib/api/reauth";
import { MAX_POLICY_BYTES, uploadSchema } from "../src/features/legal/schema";
import { referralText, toQuery } from "../src/features/students/types";

describe("re-authentication detection", () => {
  it("recognises only the backend's 403 for a stale confirmation", () => {
    expect(isReauthRequired(new ApiError(403, REAUTH_REQUIRED_MESSAGE))).toBe(
      true,
    );
    expect(
      isReauthRequired(new ApiError(403, "Requires permission: policy.create")),
    ).toBe(false);
    expect(isReauthRequired(new ApiError(401, REAUTH_REQUIRED_MESSAGE))).toBe(
      false,
    );
    expect(isReauthRequired(new Error(REAUTH_REQUIRED_MESSAGE))).toBe(false);
  });
});

describe("policy upload form", () => {
  const pdf = new File([new Uint8Array(100)], "terms.pdf", {
    type: "application/pdf",
  });
  const valid = {
    type: "student_terms",
    country: "IN",
    version: "1.0",
    title: "Student Terms",
    effectiveAt: "2026-09-01",
    file: pdf,
  };

  it("accepts a complete upload", () => {
    expect(uploadSchema.safeParse(valid).success).toBe(true);
  });

  it("explains each problem", () => {
    const result = uploadSchema.safeParse({
      ...valid,
      version: "v 1",
      title: " ",
      effectiveAt: "",
      file: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toEqual(
        expect.arrayContaining(["version", "title", "effectiveAt", "file"]),
      );
    }
  });

  it("accepts only a PDF no larger than the limit", () => {
    const notPdf = new File(["x"], "terms.docx", {
      type: "application/msword",
    });
    expect(uploadSchema.safeParse({ ...valid, file: notPdf }).success).toBe(
      false,
    );
    const named = new File(["x"], "TERMS.PDF", { type: "" });
    expect(uploadSchema.safeParse({ ...valid, file: named }).success).toBe(
      true,
    );
    const big = new File([new Uint8Array(MAX_POLICY_BYTES + 1)], "big.pdf", {
      type: "application/pdf",
    });
    expect(uploadSchema.safeParse({ ...valid, file: big }).success).toBe(false);
  });
});

describe("student list query", () => {
  it("encodes each value and leaves out empty filters", () => {
    expect(
      toQuery({
        page: 1,
        limit: 20,
        q: "Ananya Sharma",
        country: "",
        minor: undefined,
      }),
    ).toBe("?page=1&limit=20&q=Ananya%20Sharma");
    expect(toQuery({ q: "a+b@x.org" })).toBe("?q=a%2Bb%40x.org");
    expect(toQuery({})).toBe("");
  });
});

describe("student referral text", () => {
  it("shows the option name, with the student's own words for Other", () => {
    expect(referralText({ code: "instagram", name: "Instagram", other: null })).toBe(
      "Instagram",
    );
    expect(
      referralText({ code: "other", name: "Other", other: "A poster at my tuition centre" }),
    ).toBe("Other: A poster at my tuition centre");
  });
});
