import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionProvider } from '../src/components/security/permission-provider';
import { CataloguePage } from '../src/features/catalogue/components/catalogue-page';
import { addPathSchema, editChanges } from '../src/features/catalogue/schemas/catalogue';

describe('add-path and edit validation', () => {
  it('requires a board only where the category requires one, and never sends one otherwise', () => {
    const base = { categoryId: 'c', subjectId: 's', levelId: 'l', status: 'DRAFT' as const };
    expect(addPathSchema.safeParse({ ...base, requiresBoard: true }).success).toBe(false);
    expect(addPathSchema.parse({ ...base, requiresBoard: false, boardId: 'b' }).boardId).toBeUndefined();
    expect(addPathSchema.parse({ ...base, requiresBoard: true, boardId: 'b', subsectionNodeId: '' })).toEqual({ ...base, boardId: 'b', subsectionNodeId: undefined });
  });
  it('sends only changed fields, and name/slug only for nodes that own them', () => {
    const before = { name: 'Physics', slug: 'physics', sortOrder: 1, status: 'DRAFT', bookingEnabled: false };
    const after = { name: 'Physics 2', slug: 'physics-2', sortOrder: 3, status: 'PUBLISHED' as const, bookingEnabled: true };
    expect(editChanges(before, after, { ownsName: false, isCategory: false })).toEqual({ sortOrder: 3, status: 'PUBLISHED' });
    expect(editChanges(before, after, { ownsName: true, isCategory: true })).toEqual({ name: 'Physics 2', slug: 'physics-2', sortOrder: 3, status: 'PUBLISHED', bookingEnabled: true });
  });
});


describe('catalogue drawer entry points', () => {
  it('offers Add category only with catalogue.manage', () => {
    const page = (permissions: string[]) => renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}><PermissionProvider permissions={permissions}><CataloguePage tenant="t" /></PermissionProvider></QueryClientProvider>);
    expect(page(['catalogue.read'])).not.toContain('Add category');
    expect(page(['catalogue.manage'])).toContain('Add category');
  });
});
