"use client";

import { useQuery } from "@tanstack/react-query";

export type Panel = "summary" | "alerts" | "activity" | "sessions";

export type DemoState = "ready" | "loading" | "empty" | "error";

export const summary = [
  {
    label: "Total users",
    value: "9,332",
    detail:
      "9,214 students · 118 tutors · guardian details are contacts, not accounts",
  },
  {
    label: "Sessions today",
    value: "214",
    detail: "168 completed · 46 upcoming",
  },
  {
    label: "Revenue this month",
    value: "₹18,42,600",
    detail: "GST ₹3,51,668 collected",
  },
  {
    label: "Active tutors",
    value: "96",
    detail: "of 118 published profiles",
  },
];

export const alerts = [
  {
    title: "Overdue daily logs",
    detail: "5 tutors past the 11:59 PM cut-off — next-day sessions blocked",
    count: 5,
    severity: "danger",
    destination: "bookings",
    filter: "logs",
    permission: "booking.read",
  },
  {
    title: "Failed payments",
    detail: "Gateway declined — refund or ask the student to retry",
    count: 3,
    severity: "danger",
    destination: "bookings",
    filter: "payments",
    permission: "booking.read",
  },
  {
    title: "Pending faculty verifications",
    detail: "Documents uploaded, awaiting screening decision",
    count: 7,
    severity: "warning",
    destination: "faculty",
    filter: "Pending",
    permission: "faculty.read",
  },
  {
    title: "Unmoderated reviews",
    detail: "Awaiting approve / hold / hide / remove decision",
    count: 12,
    severity: "info",
    destination: "reviews",
    filter: "pending",
    permission: "review.read",
  },
];

export const activity = [
  {
    description: "Aarav Shah booked Physics · Class 11 with Anil Verma",
    time: "2 min ago",
    icon: "calendar",
  },
  {
    description: "₹1,711 received from Meera Iyer — fee ₹1,450 + GST ₹261",
    time: "18 min ago",
    icon: "money",
  },
  {
    description: "Review 9 / 10 approved for Sneha Rao by Priya Nair",
    time: "1 hr ago",
    icon: "review",
  },
  {
    description: "Rohan Das rescheduled Chemistry · NEET to 4 Sep",
    time: "2 hr ago",
    icon: "calendar",
  },
  {
    description:
      "₹1,711 refunded to Diya Sharma — tutor did not accept in 12 hr",
    time: "3 hr ago",
    icon: "money",
  },
];

const names = [
  "Aarav Shah",
  "Meera Iyer",
  "Rohan Das",
  "Ishita Nair",
  "Vivaan Gupta",
  "Diya Sharma",
];

const tutors = [
  "Anil Verma",
  "Kavita Rao",
  "Sneha Rao",
  "Rakesh Menon",
  "Anil Verma",
  "Priya Menon",
];

const subjects = [
  "Physics · Class 11",
  "Mathematics · Class 10",
  "Chemistry · NEET",
  "Biology · NEET",
  "Physics · JEE",
  "English · Class 9",
];

const statuses = [
  "Completed",
  "Completed",
  "In progress",
  "Confirmed",
  "Confirmed",
  "Cancelled",
];

export const sessions = Array.from({ length: 214 }, (_, i) => ({
  id: `demo-${i + 1}`,
  time: [
    "09:00 AM",
    "10:30 AM",
    "12:00 PM",
    "02:00 PM",
    "04:30 PM",
    "06:00 PM",
  ][i % 6],
  student: names[i % 6],
  tutor: tutors[i % 6],
  subject: subjects[i % 6],
  status: statuses[i % 6],
  fee: [145000, 125000, 180000, 180000, 160000, 0][i % 6],
}));

// Panel-specific response types
export type DashboardData = {
  summary: typeof summary;
  alerts: typeof alerts;
  activity: typeof activity;
  sessions: {
    rows: typeof sessions;
    total: number;
  };
};

export type DashboardReadOptions = {
  page?: number;
  status?: string;
  state?: DemoState;
  signal?: AbortSignal;
};

// Simulated dashboard API
export async function dashboardRead<P extends Panel>(
  panel: P,
  { page = 1, status = "", state = "ready", signal }: DashboardReadOptions = {},
): Promise<DashboardData[P]> {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(resolve, state === "loading" ? 12000 : 250);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

  if (state === "error") {
    throw new Error(`${panel} development response unavailable`);
  }

  const filtered =
    state === "empty"
      ? []
      : sessions.filter((row) => !status || row.status === status);

  const data: DashboardData = {
    summary: state === "empty" ? [] : summary,
    alerts: state === "empty" ? [] : alerts,
    activity: state === "empty" ? [] : activity,
    sessions: {
      rows: filtered.slice((page - 1) * 6, page * 6),
      total: filtered.length,
    },
  };

  return data[panel];
}

// React Query hook
export function useDashboard<P extends Panel>(
  tenant: string,
  panel: P,
  page = 1,
  status = "",
  state: DemoState = "ready",
) {
  return useQuery<DashboardData[P], Error>({
    queryKey: ["dashboard-demo", tenant, panel, { page, status, state }],
    queryFn: ({ signal }) =>
      dashboardRead(panel, {
        page,
        status,
        state,
        signal,
      }),
    retry: false,
  });
}
