import { describe, expect, it } from 'vitest';
import { adminNavigation, adminPageTitle, isNavigationActive } from '../src/components/layout/admin/navigation';
describe('admin navigation', () => {
  it('retains all eleven destinations in the requested sections', () => {
    expect(adminNavigation.map(group => group.label)).toEqual(['Overview', 'People', 'Catalogue', 'Operations', 'Finance', 'Account']);
    const items = adminNavigation.flatMap(group => group.items);
    expect(items).toHaveLength(11);
    expect(new Set(items.map(item => item[1])).size).toBe(11);
    for (const [title, suffix] of items) {
      expect(adminPageTitle(`/admin/acme${suffix}`, '/admin/acme')).toBe(title);
      expect(adminPageTitle(`/admin/acme${suffix}/record-id`, '/admin/acme')).toBe(title);
    }
  });
  it('matches detail paths without matching similarly named siblings', () => {
    expect(isNavigationActive('/admin/acme/users/123', '/admin/acme/users')).toBe(true);
    expect(isNavigationActive('/admin/acme/users-other', '/admin/acme/users')).toBe(false);
    expect(adminPageTitle('/admin/acme/unknown', '/admin/acme')).toBe('Page not found');
  });
});
