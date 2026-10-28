"use client";
import { SelectField } from "@/components/ui";
import { Button, Badge, Typography } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  PanelMessage,
  PageHeader,
  SectionCard,
  DataTable,
  StatusBadge,
  TablePagination,
  PanelSkeleton,
} from "@/components/ui/dashboard-ui";
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
export function FacultyDirectory() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const params = useSearchParams(),
    router = useRouter();
  const status = params.get("filter") ?? "",
    subject = params.get("subject") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const query = useQuery({
    queryKey: ["faculty-demo", tenantId, { status, subject, page }],
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
        subtitle="Tutor profiles · document screening and category assignment"
        action={
          <Button variant="primary" onClick={() => {}}>
            Invite tutor
          </Button>
        }
      />
      {/* <Typography
        variant="caption"
        component="p"
        tone="muted"
        className="demo-notice"
      >
        Development data · invitations and verification require a backend
        adapter
      </Typography> */}
      <div className="directory-tabs" aria-label="Faculty status filters">
        {["", "Pending", "Verified", "Published", "Suspended"].map((s) => (
          <Button
            variant="tab"
            key={s}
            aria-pressed={status === s}
            onClick={() => update({ filter: s, page: "1" })}
          >
            {s || "All profiles"}{" "}
            <Badge>
              {s ? tutors.filter((t) => t[6] === s).length : tutors.length}
            </Badge>
          </Button>
        ))}
      </div>
      <SectionCard
        title="Onboarding queue"
        subtitle="Screening, document verification and category assignment"
        action={
          <SelectField
            label="Filter subject"
            value={subject}
            onChange={(e) => update({ subject: e.target.value, page: "1" })}
          >
            <option value="">All categories</option>
            {["Physics", "Mathematics", "Chemistry", "Biology", "English"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </SelectField>
        }
      >
        {query.isPending ? (
          <PanelSkeleton rows={7} />
        ) : query.isError ? (
          <PanelMessage onRetry={() => void query.refetch()}>
            Faculty data unavailable.
          </PanelMessage>
        ) : (
          <>     
            <DataTable
              headers={[
                "Tutor",
                "Subjects",
                "Qualification",
                "Documents",
                "Applied",
                "Status",
              ]}
              caption="Demonstration faculty onboarding queue"
            >
              {query.data.rows.map((t) => (
                <tr key={t[1]}>
                  <td>
                    <strong className="cell-strong">{t[0]}</strong>
                    <Typography
                      variant="caption"
                      component="small"
                      tone="muted"
                      className="tutor-email"
                    >
                      {t[1]}
                    </Typography>
                  </td>
                  <td>{t[2]}</td>
                  <td className="muted">{t[3]}</td>
                  <td>{t[4]}</td>
                  <td className="muted">{t[5]}</td>
                  <td>
                    <StatusBadge status={t[6]} />
                  </td>
                </tr>
              ))}
            </DataTable>

            {!query.data.rows.length && (
              <PanelMessage>No tutors match these filters.</PanelMessage>
            )}

            <TablePagination
              page={page}
              limit={7}
              total={query.data.total}
              onPage={(p) => update({ page: String(p) })}
            />

          </>
        )}
      </SectionCard>
    </>
  );
}
