"use client";
import { AlertTriangle, ChevronDown, ExternalLink, FileUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { Can, usePermission } from "@/components/security/permission-provider";
import { Skeleton } from "@/components/shadcn/skeleton";
import {
  useCountries,
  usePolicies,
  usePolicyCoverage,
  useSetPolicyCurrent,
} from "./api";
import { UploadPolicyDialog } from "./upload-dialog";
import {
  POLICY_LABELS,
  POLICY_TYPES,
  policyFileUrl,
  type AdminPolicy,
  type Country,
  type PolicyCoverage,
  type PolicyType,
} from "./types";

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(iso),
  );

export function LegalPage() {
  const allowed = usePermission("policy.read");
  const countries = useCountries();
  const policies = usePolicies(allowed);
  const coverage = usePolicyCoverage(allowed);
  const [target, setTarget] = useState<{
    type: PolicyType;
    country: string;
    title: string;
  } | null>(null);
  const [open, setOpen] = useState(false);

  const byCountry = useMemo(() => {
    const groups = new Map<string, AdminPolicy[]>();
    for (const policy of policies.data ?? [])
      groups.set(policy.country, [
        ...(groups.get(policy.country) ?? []),
        policy,
      ]);
    return groups;
  }, [policies.data]);

  if (!allowed)
    return <PanelMessage>Requires policy.read permission.</PanelMessage>;

  const missing = (coverage.data ?? []).filter(
    (item) => item.missingTypes.length > 0,
  );

  function startUpload(type: PolicyType, country: string): void {
    setTarget({ type, country, title: POLICY_LABELS[type] });
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Legal documents"
        description="The policy texts students and guardians accept, one set per country. Upload a new version when a country's text changes."
      />

      {missing.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-warning-border bg-warning-subtle px-4 py-3 text-sm text-warning-foreground"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">
              Students cannot register in some countries yet
            </p>
            <ul className="mt-1 list-disc pl-5">
              {missing.map((item) => (
                <li key={item.country}>
                  {item.name}:{" "}
                  {item.missingTypes
                    .map((type) => POLICY_LABELS[type])
                    .join(", ")}{" "}
                  not uploaded.
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {countries.isError || policies.isError ? (
        <PanelMessage onRetry={() => void policies.refetch()}>
          Legal documents could not be loaded.
        </PanelMessage>
      ) : countries.isPending || policies.isPending ? (
        <div className="flex flex-col gap-6" aria-busy="true">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        (countries.data ?? []).map((country) => (
          <CountryCard
            key={country.code}
            country={country}
            policies={byCountry.get(country.code) ?? []}
            coverage={coverage.data?.find(
              (item) => item.country === country.code,
            )}
            onUpload={(type) => startUpload(type, country.code)}
          />
        ))
      )}

      {target && countries.data && (
        <UploadPolicyDialog
          open={open}
          onClose={() => setOpen(false)}
          countries={countries.data}
          initial={target}
        />
      )}
    </>
  );
}

function CountryCard({
  country,
  policies,
  coverage,
  onUpload,
}: {
  country: Country;
  policies: AdminPolicy[];
  coverage?: PolicyCoverage;
  onUpload: (type: PolicyType) => void;
}) {
  const complete = coverage ? coverage.missingTypes.length === 0 : false;
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {country.name}
          {coverage && (
            <Badge variant={complete ? "success" : "warning"}>
              {complete
                ? "All four live"
                : `${coverage.missingTypes.length} missing`}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Guardian consent applies below {country.guardianConsentAge} years.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border-subtle">
          {POLICY_TYPES.map((type) => (
            <PolicyRow
              key={type}
              type={type}
              versions={policies.filter((policy) => policy.type === type)}
              onUpload={() => onUpload(type)}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PolicyRow({
  type,
  versions,
  onUpload,
}: {
  type: PolicyType;
  versions: AdminPolicy[];
  onUpload: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const setCurrent = useSetPolicyCurrent();
  const canUpdate = usePermission("policy.update");
  const current = versions.find((version) => version.isCurrent);
  const past = versions.filter((version) => !version.isCurrent);

  return (
    <li className="px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{POLICY_LABELS[type]}</p>
          {current ? (
            <p className="text-xs text-text-secondary">
              {current.title !== POLICY_LABELS[type] && `${current.title} · `}
              version {current.version} · effective{" "}
              {formatDate(current.effectiveAt)}
            </p>
          ) : (
            <p className="text-xs text-warning-foreground">Not uploaded yet</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {current && (
            <Button variant="ghost" size="sm" asChild>
              <a
                href={policyFileUrl(current.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden className="size-4" /> View
              </a>
            </Button>
          )}
          {past.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showHistory}
              onClick={() => setShowHistory((open) => !open)}
            >
              History ({past.length}){" "}
              <ChevronDown
                aria-hidden
                className={`size-4 transition-transform ${showHistory ? "rotate-180" : ""}`}
              />
            </Button>
          )}
          <Can permission="policy.create">
            <Button
              variant={current ? "outline" : "default"}
              size="sm"
              onClick={onUpload}
            >
              <FileUp aria-hidden className="size-4" />{" "}
              {current ? "Upload new version" : "Upload"}
            </Button>
          </Can>
        </div>
      </div>
      {showHistory && (
        <ul className="mt-3 divide-y divide-border-subtle rounded-md border border-border-subtle bg-background">
          {past.map((version) => (
            <li
              key={version.id}
              className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs"
            >
              <span className="min-w-0 flex-1">
                Version {version.version} · {version.title} · effective{" "}
                {formatDate(version.effectiveAt)} · uploaded{" "}
                {formatDate(version.createdAt)}
              </span>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={policyFileUrl(version.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View
                </a>
              </Button>
              {canUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setCurrent.isPending}
                  onClick={() =>
                    setCurrent.mutate(version.id, {
                      onSuccess: () =>
                        toast.success(
                          `Version ${version.version} is current again.`,
                        ),
                    })
                  }
                >
                  Make current
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
