"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Plus, ShieldCheck } from "lucide-react";
import { CopyValue } from "@/components/feedback/copy-button";
import { PersonAvatar } from "@/components/feedback/person-avatar";
import { StatusBadge } from "@/components/feedback/status-badge";
import { SearchInput } from "@/components/forms/search-input";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { FilterSelect } from "@/features/students/students-filters";
import { roleLabel } from "@/features/roles/types";
import { useRoleOptions } from "@/features/roles/api";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { DataTable } from "@/components/data-table/data-table";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PanelMessage } from "@/components/layout/panel-message";
import { PageHeader } from "@/components/layout/page-header";
import { usePermission } from "@/components/security/permission-provider";
import { exportCSV } from "@/lib/exports/download";
import { useUsers } from "../api/users";
import { CreateUserDialog } from "./create-user-dialog";
import { UserSheet } from "./user-sheet";
import { NoAccess } from "@/components/security/no-access";
import type { UserSummary } from "../types/user";

const columns: ColumnDef<UserSummary>[] = [
  {
    accessorKey: "fullName",
    header: "Name",
    cell: ({ getValue }) => (
      <span className="flex items-center gap-3">
        <PersonAvatar name={getValue<string>()} />
        <span
          title={getValue<string>()}
          className="max-w-64 truncate font-semibold"
        >
          {getValue<string>()}
        </span>
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ getValue }) => (
      <CopyValue
        value={getValue<string>()}
        label="Email"
        className="text-text-secondary"
      />
    ),
  },
  {
    id: "roles",
    header: "Roles",
    cell: ({ row }) =>
      row.original.roles.length === 0 ? (
        <span className="text-muted-foreground">No role yet</span>
      ) : (
        <span className="flex flex-wrap gap-1">
          {row.original.roles.map((r) => (
            <Badge key={r.id} variant="secondary">
              {roleLabel(r.name)}
            </Badge>
          ))}
        </span>
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
  const [roleId, setRoleId] = useState("");
  const roles = useRoleOptions(allowed);
  const canCreate = usePermission("user.create");
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const query = useUsers({ page, limit, search, roleId }, allowed);
  if (!allowed) return <NoAccess permission="user.read" />;
  return (
    <>
      <PageHeader
        title="Users"
        description="People with an account. Open one to change their roles or deactivate them."
        actions={
          canCreate && (
            <Button onClick={() => setAdding(true)}>
              <Plus aria-hidden /> Add user
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Platform users</CardTitle>
          <CardDescription>Admins and staff. Students and tutors are in their own sections.</CardDescription>
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
            <FilterSelect
              label="Filter by role"
              icon={ShieldCheck}
              allLabel="All roles"
              className="w-44"
              value={roleId}
              options={(roles.data ?? []).map((r) => ({
                value: r.id,
                label: roleLabel(r.name),
              }))}
              onChange={(next) => {
                setRoleId(next);
                setPage(1);
              }}
            />
            <Button
              variant="outline"
              disabled={!query.data?.data.length}
              onClick={() =>
                exportCSV(
                  [
                    ["Name", "Email", "Roles", "Status"],
                    ...query.data!.data.map((u) => [
                      u.fullName,
                      u.email,
                      u.roles.map((r) => roleLabel(r.name)).join(", "),
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
              onRowClick={(user) => setSelected(user.id)}
              isRowSelected={(user) => user.id === selected}
              loading={query.isPending}
              empty={
                search || roleId
                  ? "No users match. Try a different name, email or role."
                  : "No users yet."
              }
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
      <UserSheet userId={selected} onClose={() => setSelected(null)} />
      <CreateUserDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={setSelected}
      />
    </>
  );
}
