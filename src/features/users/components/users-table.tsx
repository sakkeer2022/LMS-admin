"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { CopyValue } from "@/components/feedback/copy-button";
import { PersonAvatar } from "@/components/feedback/person-avatar";
import { StatusBadge } from "@/components/feedback/status-badge";
import { SearchInput } from "@/components/forms/search-input";
import { Button } from "@/components/shadcn/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { DataTable } from "@/components/data-table/data-table";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PanelMessage } from "@/components/layout/panel-message";
import { PageHeader } from "@/components/layout/page-header";
import { usePermission } from "@/components/security/permission-provider";
import { exportCSV } from "@/lib/exports/download";
import { useUsers } from "../api/users";
import type { UserSummary } from "../types/user";

const columns: ColumnDef<UserSummary>[] = [
  {
    accessorKey: "fullName",
    header: "Name",
    cell: ({ getValue }) => (
      <span className="flex items-center gap-3">
        <PersonAvatar name={getValue<string>()} />
        <span title={getValue<string>()} className="max-w-64 truncate font-semibold">
          {getValue<string>()}
        </span>
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ getValue }) => (
      <CopyValue value={getValue<string>()} label="Email" className="text-text-secondary" />
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ getValue }) =>
      getValue<boolean>() ? (
        <StatusBadge status="active">Active</StatusBadge>
      ) : (
        <StatusBadge status="inactive">Disabled</StatusBadge>
      ),
  },
];

export function UsersTable() {
  const allowed = usePermission("user.read");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const query = useUsers({ page, limit, search }, allowed);
  if (!allowed)
    return <PanelMessage>Requires user.read permission.</PanelMessage>;
  return (
    <>
      <PageHeader title="Users" description="Platform-wide administrative data." />
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Platform users</CardTitle>
          <CardDescription>Search by name or email</CardDescription>
          <CardAction className="flex items-center gap-2">
            <SearchInput
              label="Search users"
              placeholder="Search users"
              className="w-56"
              value={search}
              onChange={(next) => {
                setSearch(next);
                setPage(1);
              }}
            />
            <Button
              variant="outline"
              disabled={!query.data?.data.length}
              onClick={() =>
                exportCSV(
                  [
                    ["Name", "Email", "Status"],
                    ...query.data!.data.map((u) => [
                      u.fullName,
                      u.email,
                      u.isActive ? "Active" : "Disabled",
                    ]),
                  ],
                  "users-current-page.csv",
                )
              }
            >
              <Download aria-hidden />
              Export current page CSV
            </Button>
          </CardAction>
        </CardHeader>
        {query.isError ? (
          <PanelMessage onRetry={() => void query.refetch()}>
            Users could not be loaded.
          </PanelMessage>
        ) : (
          <>
            <DataTable
              caption={`User directory, page ${page}`}
              columns={columns}
              data={query.data?.data ?? []}
              getRowId={(user) => user.id}
              loading={query.isPending}
              empty={search ? `No users match "${search}". Try a different name or email.` : "No users yet."}
            />
            {query.data && (
              <TablePagination
                page={page}
                limit={limit}
                total={query.data.meta?.total ?? query.data.data.length}
                noun="users"
                onPage={setPage}
                onLimit={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </Card>
    </>
  );
}
