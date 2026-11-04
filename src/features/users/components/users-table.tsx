"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { DataTable } from "@/components/data-table/data-table";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PanelMessage } from "@/components/layout/panel-message";
import { PageHeader } from "@/components/layout/page-header";
import { usePermission } from "@/components/security/permission-provider";
import { exportCSV } from "@/lib/exports/download";
import { useUsers } from "../api/users";
import type { UserSummary } from "../types/user";

const LIMIT = 20;

const columns: ColumnDef<UserSummary>[] = [
  {
    accessorKey: "fullName",
    header: "Name",
    cell: ({ getValue }) => <span className="font-semibold">{getValue<string>()}</span>,
  },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ getValue }) =>
      getValue<boolean>() ? (
        <Badge variant="success">Active</Badge>
      ) : (
        <Badge variant="secondary">Disabled</Badge>
      ),
  },
];

export function UsersTable() {
  const allowed = usePermission("user.read");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const query = useUsers({ page, limit: LIMIT, search }, allowed);
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
            <Input
              type="search"
              aria-label="Search users"
              placeholder="Search users"
              className="w-56"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
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
              empty="No users found."
            />
            {query.data && (
              <TablePagination
                page={page}
                limit={LIMIT}
                total={query.data.meta?.total ?? query.data.data.length}
                noun="users"
                onPage={setPage}
              />
            )}
          </>
        )}
      </Card>
    </>
  );
}
