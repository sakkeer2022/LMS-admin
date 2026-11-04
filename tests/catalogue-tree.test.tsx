import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../src/lib/api/contracts';
import { describeApiError } from '../src/lib/api/errors';
import { nodeDetailSchema, treeNodeSchema, type TreeNode } from '../src/lib/api/catalogue';
import { addPathPrefill, ancestorsOf, canPlace, childCountLabel, moveTargets, nodeActions, offeringsFromTrees, withoutArchived } from '../src/lib/api/catalogue-tree';
import { TreeAccordion, visibleTreeRows } from '../src/components/ui';
import { PermissionProvider } from '../src/components/security/permission-provider';
import { NodeDetailView, countLabel } from '../src/features/catalogue/components/node-detail-panel';
import { CataloguePage } from '../src/features/catalogue/components/catalogue-page';

// Shapes copied from live responses of the LMS-58 backend (demo seed)
const counts = { subsections: 0, boards: 0, subjects: 0, levels: 0 };
const node = (id: string, type: TreeNode['type'], name: string, children: TreeNode[] = [], extra: Partial<TreeNode> = {}): TreeNode => ({
  id, parentId: null, type, name, slug: name.toLowerCase(), status: 'PUBLISHED', sortOrder: 1, categoryId: null, boardId: null, subjectId: null,
  levelId: null, bookingEnabled: false, curriculumId: null, childCount: children.length, counts, children, ...extra,
});
const level11 = node('lv11', 'LEVEL', 'Class 11', [], { parentId: 'phy', levelId: 'L11', curriculumId: 'cur11' });
const level12 = node('lv12', 'LEVEL', 'Class 12', [], { parentId: 'phy', levelId: 'L12', curriculumId: 'cur12', status: 'DRAFT' });
const physics = node('phy', 'SUBJECT', 'Physics', [level11, level12], { parentId: 'cbse', subjectId: 'S-phy' });
const chemistry = node('chem', 'SUBJECT', 'Chemistry', [], { parentId: 'icse', subjectId: 'S-chem', status: 'ARCHIVED' });
const cbse = node('cbse', 'BOARD', 'CBSE', [physics], { parentId: 'k12', boardId: 'B-cbse' });
const icse = node('icse', 'BOARD', 'ICSE', [chemistry], { parentId: 'k12', boardId: 'B-icse' });
const k12 = node('k12', 'SUBSECTION', 'K-12', [cbse, icse], { parentId: 'school' });
const school = node('school', 'CATEGORY', 'School', [k12], { categoryId: 'C-school' });

describe('API schemas accept the live response shapes', () => {
  it('parses a nested tree and a node detail with null counts', () => {
    expect(treeNodeSchema.parse(school).children[0].children[0].name).toBe('CBSE');
    const detail = nodeDetailSchema.parse({ ...level11, rootId: 'school', path: [{ id: 'school', type: 'CATEGORY', name: 'School' }], libraryResources: null,
      tutorsMapped: null, sessionsThisMonth: null, sessionPricePaise: 120000, createdAt: '2026-10-29T09:30:00.000Z', updatedAt: '2026-10-29T09:30:00.000Z' });
    expect(detail.libraryResources).toBeNull();
  });
});

describe('error mapping', () => {
  it('maps status codes to readable messages and field errors', () => {
    expect(describeApiError(new ApiError(403, 'Requires permission: pricing.manage'), 'change prices')).toMatchObject({ kind: 'forbidden', message: "You don't have permission to change prices." });
    expect(describeApiError(new ApiError(409, 'This price was changed by someone else; reload and try again')).kind).toBe('stale');
    expect(describeApiError(new ApiError(409, 'This path already exists'))).toMatchObject({ kind: 'conflict', message: 'This path already exists' });
    expect(describeApiError(new ApiError(422, 'Validation failed', { boardId: ['Required'] }))).toMatchObject({ kind: 'validation', fields: { boardId: 'Required' } });
    expect(describeApiError(new ApiError(503, 'down', undefined, 'trace-1')).message).toContain('trace-1');
  });
});

describe('catalogue tree rules (mirror of the backend checkPlacement)', () => {
  it('allows only the documented parent types', () => {
    expect(canPlace('BOARD', 'SUBSECTION', true)).toBe(true);
    expect(canPlace('BOARD', 'CATEGORY', false)).toBe(false);
    expect(canPlace('SUBJECT', 'SUBSECTION', true)).toBe(false);
    expect(canPlace('SUBJECT', 'CATEGORY', false)).toBe(true);
    expect(canPlace('LEVEL', 'BOARD', true)).toBe(false);
    expect(canPlace('CATEGORY', 'CATEGORY', false)).toBe(false);
  });
  it('offers move targets in the same category, never the node itself, its parent or an archived node', () => {
    expect(moveTargets(school, physics, true)).toEqual([{ id: 'icse', label: 'School › K-12 › ICSE' }]);
    // Physics is the current parent and Chemistry is archived, so a level has nowhere to go
    expect(moveTargets(school, level11, true)).toEqual([]);
  });
  it('labels children by type and hides archived nodes', () => {
    expect(childCountLabel(k12)).toBe('2 boards');
    expect(childCountLabel(physics)).toBe('2 levels');
    expect(withoutArchived([school])[0].children[0].children[1].children).toEqual([]);
  });
  it('prefills add-child from the ancestors and limits actions by type', () => {
    expect(ancestorsOf([school], 'lv11').map((a) => a.id)).toEqual(['school', 'k12', 'cbse', 'phy']);
    expect(addPathPrefill([school], physics)).toEqual({ categoryId: 'C-school', subsectionNodeId: 'k12', boardId: 'B-cbse', subjectId: 'S-phy' });
    expect(nodeActions(school)).toMatchObject({ addChild: true, move: false, archive: false });
    expect(nodeActions(level11)).toMatchObject({ addChild: false, move: true, archive: true });
  });
  it('lists only existing, non-archived combinations for pricing', () => {
    const offerings = offeringsFromTrees([school], [{ id: 'C-school', code: 'school', name: 'School', requiresBoard: true, isActive: true }]);
    expect(offerings.map((o) => [o.curriculumId, o.boardName, o.subjectName, o.levelName, o.status])).toEqual([
      ['cur11', 'CBSE', 'Physics', 'Class 11', 'PUBLISHED'], ['cur12', 'CBSE', 'Physics', 'Class 12', 'DRAFT'],
    ]);
  });
});

describe('rendering', () => {
  it('shows "—" for counts the API reports as null, never 0', () => {
    expect(countLabel(null)).toBe('—');
    expect(countLabel(0)).toBe('0');
    const html = renderToStaticMarkup(<NodeDetailView pricingHref="/admin/t/pricing" actions={{}} node={nodeDetailSchema.parse({ ...level11, rootId: 'school', path: [],
      libraryResources: null, tutorsMapped: 3, sessionsThisMonth: null, sessionPricePaise: null, createdAt: '2026-10-29T09:30:00.000Z', updatedAt: '2026-10-29T09:30:00.000Z' })} />);
    expect(html.match(/—/g)).toHaveLength(2);
    expect(html).toContain('Not configured');
    expect(html).toContain('href="/admin/t/pricing"');
  });
  it('renders an accessible tree with expanded state', () => {
    const html = renderToStaticMarkup(<TreeAccordion label="Catalogue tree" roots={[school]} expanded={new Set(['school'])} onExpandedChange={() => {}} onSelect={() => {}} renderLabel={(n) => n.name} />);
    expect(html).toContain('role="tree"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(visibleTreeRows([school], new Set(['school'])).map((r) => r.node.id)).toEqual(['school', 'k12']);
  });
  it('hides catalogue actions without catalogue.manage, and the page without catalogue.read', () => {
    const page = (permissions: string[]) => renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}><PermissionProvider permissions={permissions}><CataloguePage tenant="t" /></PermissionProvider></QueryClientProvider>);
    expect(page([])).toContain('permission to view the catalogue');
    expect(page(['catalogue.read'])).not.toContain('Reorder');
    expect(page(['catalogue.manage'])).toContain('Reorder');
  });
});
