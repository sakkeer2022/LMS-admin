import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { PersonAvatar } from "@/components/feedback/person-avatar";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Tip } from "@/components/feedback/tip";
import { Button } from "@/components/shadcn/button";
import { formatDate, relativeDate } from "@/lib/format/dates";
import { ConsentBadge, MinorBadge } from "./student-ui";
import { RELATIONSHIP_LABELS, type AdminStudent } from "./types";

interface Props {
  students: AdminStudent[];
  loading: boolean;
  caption: string;
  /** Country code to display name */
  countryName: (code: string) => string;
  /** The student whose drawer is open, shown as the selected row */
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const guardianRelation = (student: AdminStudent): string =>
  student.guardian
    ? (RELATIONSHIP_LABELS[student.guardian.relationship] ??
      student.guardian.relationship)
    : "";

function Identity({ student }: { student: AdminStudent }) {
  return (
    <>
      <PersonAvatar name={student.fullName} />
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2">
          <span title={student.fullName} className="truncate text-sm font-semibold">
            {student.fullName}
          </span>
          {!student.isActive && <StatusBadge status="inactive">Disabled</StatusBadge>}
        </span>
        <span title={student.email} className="truncate text-xs text-text-secondary">
          {student.email}
        </span>
      </span>
    </>
  );
}

/** The student's phone card: identity, consent and age at a glance, then guardian and registration. */
function StudentCard({
  student,
  countryName,
}: {
  student: AdminStudent;
  countryName: (code: string) => string;
}) {
  return (
    <>
      <span className="flex items-center gap-3">
        <Identity student={student} />
        <ChevronRight aria-hidden className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <ConsentBadge status={student.consentStatus} />
        {student.isMinor && <MinorBadge />}
        <span className="text-xs text-text-secondary">
          {student.age} yrs · {countryName(student.country)}
        </span>
      </span>
      {student.guardian && (
        <span className="text-xs text-text-secondary">
          Guardian: {student.guardian.fullName} ({guardianRelation(student)})
        </span>
      )}
      <span className="text-xs text-text-secondary">
        Registered {formatDate(student.registeredAt)} · {relativeDate(student.registeredAt)}
      </span>
    </>
  );
}

/** The Students listing: a table from `md`, cards below it, both from the shared `DataTable`. */
export function StudentsList({
  students,
  loading,
  caption,
  countryName,
  selectedId,
  onSelect,
}: Props) {
  const columns = useMemo<ColumnDef<AdminStudent>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => (
          // A real button, so the row is reachable by keyboard; clicking the row also opens it
          <button
            type="button"
            className="flex max-w-72 min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(row.original.id);
            }}
          >
            <Identity student={row.original} />
          </button>
        ),
      },
      {
        id: "age",
        header: "Age",
        cell: ({ row }) => (
          <span className="flex items-center gap-2 tabular-nums">
            {row.original.age}
            {row.original.isMinor && <MinorBadge />}
          </span>
        ),
      },
      {
        id: "country",
        header: "Country",
        cell: ({ row }) => countryName(row.original.country),
      },
      {
        id: "guardian",
        header: "Guardian",
        cell: ({ row }) =>
          row.original.guardian ? (
            <span className="flex flex-col">
              <span>{row.original.guardian.fullName}</span>
              <span className="text-xs text-text-secondary">{guardianRelation(row.original)}</span>
            </span>
          ) : (
            <span className="text-text-secondary">—</span>
          ),
      },
      {
        id: "consent",
        header: "Guardian consent",
        cell: ({ row }) => <ConsentBadge status={row.original.consentStatus} />,
      },
      {
        id: "registered",
        header: "Registered",
        cell: ({ row }) => (
          <span className="flex flex-col">
            <span className="text-text-secondary">{formatDate(row.original.registeredAt)}</span>
            <span className="text-xs text-muted-foreground">{relativeDate(row.original.registeredAt)}</span>
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        meta: { className: "w-12 text-right" },
        cell: ({ row }) => (
          <Tip label="View student">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`View ${row.original.fullName}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(row.original.id);
              }}
            >
              <ChevronRight />
            </Button>
          </Tip>
        ),
      },
    ],
    [countryName, onSelect],
  );

  return (
    <DataTable
      caption={caption}
      columns={columns}
      data={students}
      getRowId={(student) => student.id}
      loading={loading}
      loadingRows={8}
      onRowClick={(student) => onSelect(student.id)}
      isRowSelected={(student) => student.id === selectedId}
      renderCard={(student) => <StudentCard student={student} countryName={countryName} />}
    />
  );
}
