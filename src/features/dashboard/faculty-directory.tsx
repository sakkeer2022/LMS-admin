"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { DataTable } from "@/components/data-table/data-table";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";

const tutors = [
  [
    "Anjali Deshpande",
    "anjali.deshpande@gmail.com",
    "Physics · Chemistry",
    "Ph.D. · IIT Bombay",
    "4 of 4",
    "28 Aug",
    "Pending",
  ],
  [
    "Rakesh Menon",
    "r.menon@outlook.com",
    "Biology · NEET",
    "M.Sc. · AIIMS Delhi",
    "3 of 4",
    "29 Aug",
    "Pending",
  ],
  [
    "Priya Menon",
    "priya.menon@gmail.com",
    "English",
    "M.A. · JNU",
    "2 of 4",
    "31 Aug",
    "Pending",
  ],
  [
    "Sneha Rao",
    "sneha.rao@gmail.com",
    "Chemistry · NEET",
    "Ph.D. · IISc Bengaluru",
    "4 of 4",
    "30 Aug",
    "Verified",
  ],
  [
    "Kavita Rao",
    "kavita.rao@amentorz.in",
    "Mathematics",
    "M.Sc. · Delhi University",
    "4 of 4",
    "25 Aug",
    "Published",
  ],
  [
    "Anil Verma",
    "anil.verma@gmail.com",
    "Physics · JEE",
    "Ph.D. · IIT Delhi",
    "4 of 4",
    "12 Aug",
    "Published",
  ],
  [
    "Dev Sharma",
    "dev.sharma@gmail.com",
    "Mathematics · JEE",
    "M.Tech. · IIT Madras",
    "4 of 4",
    "1 Sep",
    "Suspended",
  ],
];

type Tutor = (typeof tutors)[number];

const statusVariant = {
  Pending: "warning",
  Verified: "info",
  Published: "success",
  Suspended: "destructive",
} as const;

const columns: ColumnDef<Tutor>[] = [
  {
    id: "tutor",
    header: "Tutor",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <strong className="font-semibold">{row.original[0]}</strong>
        <small className="text-xs text-muted-foreground">{row.original[1]}</small>
      </div>
    ),
  },
  { id: "subjects", header: "Subjects", accessorFn: (t) => t[2] },
  {
    id: "qualification",
    header: "Qualification",
    accessorFn: (t) => t[3],
    cell: ({ getValue }) => <span className="text-text-secondary">{getValue<string>()}</span>,
  },
  { id: "documents", header: "Documents", accessorFn: (t) => t[4] },
  {
    id: "applied",
    header: "Applied",
    accessorFn: (t) => t[5],
    cell: ({ getValue }) => <span className="text-text-secondary">{getValue<string>()}</span>,
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (t) => t[6],
    cell: ({ getValue }) => (
      <Badge variant={statusVariant[getValue<string>() as keyof typeof statusVariant]}>
        {getValue<string>()}
      </Badge>
    ),
  },
];

const FILTERS = ["", "Pending", "Verified", "Published", "Suspended"];
const SUBJECTS = ["Physics", "Mathematics", "Chemistry", "Biology", "English"];
const ALL = "all";

export function FacultyDirectory() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("filter") ?? "";
  const subject = params.get("subject") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const query = useQuery({
    queryKey: ["faculty-demo", { status, subject, page }],
    queryFn: async () => {
      const rows = tutors.filter(
        (t) =>
          (!status || t[6] === status) && (!subject || t[2].includes(subject)),
      );
      return { rows: rows.slice((page - 1) * 7, page * 7), total: rows.length };
    },
  });
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([k, v]) =>
      v ? next.set(k, v) : next.delete(k),
    );
    router.replace(`?${next}`, { scroll: false });
  }
  return (
    <>
      <PageHeader
        title="Faculty"
        description="Tutor profiles · document screening and category assignment"
        actions={<Button onClick={() => {}}>Invite tutor</Button>}
      />
      <Tabs value={status || ALL} onValueChange={(v) => update({ filter: v === ALL ? "" : v, page: "1" })}>
        <TabsList aria-label="Faculty status filters">
          {FILTERS.map((s) => (
            <TabsTrigger key={s || ALL} value={s || ALL} className="gap-2">
              {s || "All profiles"}
              <Badge variant="secondary">
                {s ? tutors.filter((t) => t[6] === s).length : tutors.length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Onboarding queue</CardTitle>
          <CardDescription>Screening, document verification and category assignment</CardDescription>
          <CardAction>
            <Select
              value={subject || ALL}
              onValueChange={(v) => update({ subject: v === ALL ? "" : v, page: "1" })}
            >
              <SelectTrigger aria-label="Filter subject" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        {query.isError ? (
          <PanelMessage onRetry={() => void query.refetch()}>Faculty data unavailable.</PanelMessage>
        ) : (
          <>
            <DataTable
              caption="Demonstration faculty onboarding queue"
              columns={columns}
              data={query.data?.rows ?? []}
              getRowId={(t) => t[1]}
              loading={query.isPending}
              loadingRows={7}
              empty="No tutors match these filters."
            />
            {query.data && (
              <TablePagination
                page={page}
                limit={7}
                total={query.data.total}
                noun="tutors"
                onPage={(p) => update({ page: String(p) })}
              />
            )}
          </>
        )}
      </Card>
    </>
  );
}
