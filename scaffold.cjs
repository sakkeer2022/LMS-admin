const fs = require('node:fs');
const path = require('node:path');
function write(file, value) { const target = path.join(__dirname, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); }
for (const portal of ['admin', 'faculty', 'student', 'session']) {
  write(`src/app/(${portal})/layout.tsx`, `import type { ReactNode } from 'react';
// Group layout owns presentation only; tenant layout performs authoritative session checks.
export default function Layout({ children }: { children: ReactNode }) { return <${portal === 'session' ? 'div className="session"' : 'div'}>{children}</div>; }
`);
  write(`src/app/(${portal})/${portal}/[tenantId]/layout.tsx`, `import type { ReactNode } from 'react';
import { requirePortal } from '@/lib/auth/server';
import { PermissionProvider } from '@/components/security/permission-provider';
import { PortalShell } from '@/components/layout/portal-shell';
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params; const claims = await requirePortal('${portal}', tenantId);
  return <PermissionProvider permissions={claims.permissions}>${portal === 'session' ? '<main id="main">{children}</main>' : `<PortalShell portal="${portal}" tenant={tenantId}>{children}</PortalShell>`}</PermissionProvider>;
}
`);
}
const pages = {
 admin: { '': ['Operations overview', 'Moderation, approvals, disputes and financial controls belong to explicit permission boundaries.'], audit: ['Audit logs', 'Connect the audit.read protected endpoint. Do not log sensitive payloads in the browser.'], reports: ['Financial reports', 'CSV utilities and XLSX/PDF download adapters are available. Backend report endpoints must enforce authorization and audit exports.'] },
 faculty: { '': ['Your working day', 'Review bookings, complete session logs and check account blockers.'], availability: ['Availability calendar', 'Store UTC instants and an IANA time zone. Slot creation requires a backend scheduling contract.'], bookings: ['Booking requests', 'Accept/reject drawers must use server capabilities and revalidate availability.'], logs: ['Daily session logs', 'Backend blockers should disable tomorrow’s bookings until required logs are submitted.'], earnings: ['Earnings & incentives', 'Render authoritative GST/TDS amounts from the backend using the INR formatter.'] },
 student: { '': ['Discover your next tutor', 'Connect facet search and the SlotPicker once discovery endpoints exist.'], bookings: ['Your bookings', 'Display server payment-pending status; verify capture before confirming a booking.'], reports: ['Progress reports', 'Mount the authenticated PDF viewer after the report endpoint is implemented.'] },
};
for (const [portal, routes] of Object.entries(pages)) for (const [suffix, [title, description]] of Object.entries(routes)) write(`src/app/(${portal})/${portal}/[tenantId]/${suffix ? suffix + '/' : ''}page.tsx`, `import { ExtensionPanel } from '@/components/ui/extension-panel';
export default function Page() { return <ExtensionPanel title=${JSON.stringify(title)} description=${JSON.stringify(description)} />; }
`);
for (const [slug, title] of Object.entries({ otp: 'Email OTP', recovery: 'Password recovery', consent: 'Guardian consent' })) write(`src/app/(auth)/${slug}/page.tsx`, `import { ExtensionPanel } from '@/components/ui/extension-panel';
export default function Page() { return <ExtensionPanel title="${title}" description="Backend support is required. This extension has no active submission flow until an approved endpoint and validation contract exist." />; }
`);
for (const domain of ['bookings', 'discovery', 'sessions', 'earnings']) {
  write(`src/features/${domain}/api/keys.ts`, `export const ${domain}Keys = { all: (tenantId: string) => ['${domain}', tenantId] as const, list: (tenantId: string, filters: Record<string, string>) => ['${domain}', tenantId, 'list', filters] as const };\n`);
  write(`src/features/${domain}/types/README.md`, 'Proposed domain contracts belong here. No matching backend DTO exists yet. Do not label UI view models as backend DTOs.\n');
  write(`src/features/${domain}/schemas/README.md`, 'Add Zod schemas only after the corresponding backend contract is agreed. Validate explicit-offset ISO instants and integer minor-unit money.\n');
  write(`src/features/${domain}/components/README.md`, 'Place domain components here. Import only this domain, shared primitives, and lib abstractions.\n');
}
