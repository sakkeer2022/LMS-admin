import { z } from "zod";

const percent = z
  .number({ error: "Enter a number" })
  .min(0, "Must be 0 or more")
  .max(100, "Must be 100 or less");
const whole = z
  .number({ error: "Enter a number" })
  .int("Use a whole number")
  .min(0, "Must be 0 or more");

export const platformSettingsSchema = z.object({
  gstRate: percent,
  tdsRate: percent,
  pointsPerParameter: whole,
  penaltyPerBreach: whole,
  penaltyFloor: whole,
  lateLoginGraceMinutes: whole,
  uninformedCancellationHours: whole,
  pointsThreshold: whole,
  billableSessionThreshold: whole,
  billableSessionMinutes: whole,
  incentiveRate: percent,
  fullPointsRating: whole.max(10, "Ratings are scored 1–10"),
  halfPointsRating: whole.max(10, "Ratings are scored 1–10"),
  reviewEditWindowDays: whole,
  minimumReviewsBeforeRating: whole,
  dailyLogCutoff: z.string().trim().min(1, "Enter a time"),
  bookingWindowDays: whole,
  bookingAutoRefundHours: whole,
});

export type PlatformSettings = z.infer<typeof platformSettingsSchema>;

// Values shown in the approved design. No settings service exists yet, so these are display defaults.
export const settingsDefaults: PlatformSettings = {
  gstRate: 18,
  tdsRate: 10,
  pointsPerParameter: 10,
  penaltyPerBreach: 5,
  penaltyFloor: 0,
  lateLoginGraceMinutes: 5,
  uninformedCancellationHours: 24,
  pointsThreshold: 40,
  billableSessionThreshold: 30,
  billableSessionMinutes: 20,
  incentiveRate: 10,
  fullPointsRating: 8,
  halfPointsRating: 7,
  reviewEditWindowDays: 7,
  minimumReviewsBeforeRating: 5,
  dailyLogCutoff: "11:59 PM",
  bookingWindowDays: 14,
  bookingAutoRefundHours: 12,
};

type Row = {
  name: keyof PlatformSettings;
  label: string;
  description: string;
  unit?: "%";
  clock?: boolean;
};

export type SettingsSection = {
  title: string;
  description: string;
  rows: Row[];
  callout?: string;
};

export const settingsSections: SettingsSection[] = [
  {
    title: "Tax",
    description: "Applied at invoice and payout time",
    rows: [
      { name: "gstRate", label: "GST rate", unit: "%", description: "Charged on every session fee and split CGST 9% + SGST 9% on the student invoice." },
      { name: "tdsRate", label: "TDS rate", unit: "%", description: "Deducted from gross tutor earnings — base salary plus incentive — before payout." },
    ],
  },
  {
    title: "Incentive scoring",
    description: "Five parameters, 10 points each, 50 points available",
    rows: [
      { name: "pointsPerParameter", label: "Points per parameter", description: "Progress reports · on-time login · student rating · uninformed cancellations · session volume." },
      { name: "penaltyPerBreach", label: "Penalty per breach", description: "Deducted from the relevant parameter for each late login or uninformed cancellation." },
      { name: "penaltyFloor", label: "Penalty floor", description: "The lowest a single parameter can fall to. The month total never goes negative." },
      { name: "lateLoginGraceMinutes", label: "Late-login grace (minutes)", description: "Joining at the start time plus this many minutes or later counts as a late login." },
      { name: "uninformedCancellationHours", label: "Uninformed cancellation notice (hours)", description: "A cancellation with less notice than this is uninformed and carries a penalty." },
    ],
    callout:
      "Points and penalties are free-form numbers. While every parameter is worth 10 and every penalty is 5, all totals are multiples of 5 and a score like 38 / 50 is unreachable. Setting a value that is not a multiple of 5 changes that — a rules decision that is still open.",
  },
  {
    title: "Eligibility",
    description: "Both conditions must clear — failing either pays ₹0 for the month",
    rows: [
      { name: "pointsThreshold", label: "Points threshold", description: "Minimum score out of 50. This is condition 2 of the incentive gate." },
      { name: "billableSessionThreshold", label: "Billable session threshold", description: "Minimum billable sessions in the month. This is condition 1 of the incentive gate." },
      { name: "billableSessionMinutes", label: "Billable session length (minutes)", description: "A session longer than this is billable. Shorter sessions and cancellations never count." },
      { name: "incentiveRate", label: "Incentive rate", unit: "%", description: "Percentage of the session fee paid on each billable session from the 31st onward, added on top of base salary and paid only when both conditions clear." },
    ],
  },
  {
    title: "Ratings",
    description: "Reviews are scored 1–10 and moderated before publication",
    rows: [
      { name: "fullPointsRating", label: "Full-points rating cut-off", description: "An average rating at or above this earns the full 10 rating points." },
      { name: "halfPointsRating", label: "Half-points rating cut-off", description: "At or above this but below the full cut-off earns 5 rating points." },
      { name: "reviewEditWindowDays", label: "Review edit window (days)", description: "How long a student may edit a published review before it locks." },
      { name: "minimumReviewsBeforeRating", label: "Minimum reviews before rating shows", description: "A tutor’s aggregate rating appears on their public profile and in search only once this many reviews are published." },
    ],
  },
  {
    title: "Operations",
    description: "Daily rhythm and booking guarantees",
    rows: [
      { name: "dailyLogCutoff", label: "Daily log cut-off", clock: true, description: "After this time the previous day’s log locks and the tutor’s next-day sessions are blocked." },
      { name: "bookingWindowDays", label: "Booking & availability window", description: "How far in advance tutors can set availability and students can book sessions." },
      { name: "bookingAutoRefundHours", label: "Booking auto-refund window (hours)", description: "If the tutor has not accepted within this window the booking auto-refunds fee and GST together." },
    ],
  },
];
