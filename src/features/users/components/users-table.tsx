"use client";
import { useState } from "react";
import { Button, Card, Typography } from "@/components/ui";
import { TextField, FormError } from "@/components/ui";
import {
  DataTable,
  TablePagination,
  PanelSkeleton,
} from "@/components/ui/dashboard-ui";
import { usePermission } from "@/components/security/permission-provider";
import { exportCSV } from "@/lib/exports/download";
import { useUsers } from "../api/users";
import { hasDevAdminSession } from '@/lib/auth/dev-admin';
export function UsersTable({ tenant }: { tenant: string }) {
  const allowed = usePermission("user.read");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const query = useUsers(tenant, { page, limit: 20, search }, allowed);
  if (!allowed) return <FormError message="Requires user.read permission." />;
  return (
    <Card>
      <Typography variant="h1">Platform users</Typography>
      <Typography>
        Platform-wide administrative data. This endpoint is not tenant-scoped.
      </Typography>
      <TextField
        label="Search users"
        type="search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      {query.isPending ? (
        <PanelSkeleton />
      ) : query.isError ? (
        <FormError message={hasDevAdminSession() ? 'Development session: live users are unavailable. Use a real account to load backend data.' : 'Users could not be loaded.'} />
      ) : (
        <>
          <DataTable
            caption={`User directory, page ${page}`}
            headers={["Name", "Email", "Status"]}
          >
            {query.data.data.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.email}</td>
                <td>{user.isActive ? "Active" : "Disabled"}</td>
              </tr>
            ))}
          </DataTable>
          {query.data.data.length === 0 && (
            <Typography>No users found.</Typography>
          )}
          <TablePagination
            page={page}
            limit={20}
            total={query.data.meta?.total ?? query.data.data.length}
            onPage={setPage}
          />
          <Button
            onClick={() =>
              exportCSV(
                [
                  ["Name", "Email", "Status"],
                  ...query.data.data.map((u) => [
                    `${u.firstName} ${u.lastName}`,
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
        </>
      )}
    </Card>
  );
}
