import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { PermissionProvider } from '../src/components/security/permission-provider';
import { countsSchema, submissionDetailSchema, submissionSchema } from '../src/features/library/api/library';
import { LibraryContentTab, SubmissionStatusBadge } from '../src/features/library/components/library-content-tab';
import { CategoryTreePage } from '../src/features/category-tree/components/category-tree-page';

function wrap(children: ReactNode, permissions: string[]) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <PermissionProvider permissions={permissions}>{children}</PermissionProvider>
    </QueryClientProvider>,
  );
}

// A live response from GET /admin/library (2026-11-12)
const submission = {
  id: 's1', resourceId: 'm1', revision: 2, isEdit: true, status: 'pending',
  kind: 'file', title: 'Kinematics v2', description: null, body: null,
  file: { name: 'diagram.png', size: 1024, mimeType: 'image/png', previewable: true },
  submittedAt: '2026-11-12T08:00:00.000Z', reviewedAt: null, reviewNotes: null,
  faculty: { id: 'f1', fullName: 'Anil Verma', email: 'anil@example.com' },
  card: { curriculumId: 'c1', subject: 'Class 11', pathLabel: 'Academic › School › K-12 › CBSE › Physics' },
};

describe('Library content (admin)', () => {
  it('parses the live response shapes', () => {
    expect(submissionSchema.parse(submission).isEdit).toBe(true);
    const detail = submissionDetailSchema.parse({
      ...submission,
      live: { kind: 'file', title: 'Kinematics', description: 'Chapter 3', body: null, file: { name: 'k.pdf', size: 10, mimeType: 'application/pdf', previewable: true }, revision: 1 },
      history: [
        { revision: 2, status: 'pending', submittedAt: submission.submittedAt, reviewedAt: null, reviewNotes: null },
        { revision: 1, status: 'approved', submittedAt: submission.submittedAt, reviewedAt: submission.submittedAt, reviewNotes: null },
      ],
    });
    expect(detail.live?.revision).toBe(1);
    expect(countsSchema.parse({ pending: 1, approved: 0, rejected: 2 }).rejected).toBe(2);
  });

  it('labels each status', () => {
    expect(renderToStaticMarkup(<SubmissionStatusBadge status="pending" />)).toContain('Pending review');
    expect(renderToStaticMarkup(<SubmissionStatusBadge status="rejected" />)).toContain('Rejected');
  });

  it('shows the queue to moderators only', () => {
    expect(wrap(<LibraryContentTab />, ['library.moderate'])).toContain('Library content');
    expect(wrap(<LibraryContentTab />, [])).toContain('permission to review library content');
  });

  it('adds the Library content tab beside Categories for moderators', () => {
    expect(wrap(<CategoryTreePage />, ['catalogue.read', 'library.moderate'])).toContain('Library content');
    expect(wrap(<CategoryTreePage />, ['catalogue.read'])).not.toContain('Library content');
  });
});
