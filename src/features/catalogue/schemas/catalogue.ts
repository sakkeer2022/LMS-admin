import { z } from 'zod';

// Mirrors the backend catalogue.dto.ts CreatePathDto and UpdateNodeDto. The server
// still validates every write; these give early, field-level feedback.

const required = (label: string) => z.string({ error: `Choose a ${label}` }).min(1, `Choose a ${label}`);

export const addPathSchema = z
  .object({
    categoryId: required('category'),
    requiresBoard: z.boolean(),
    subsectionNodeId: z.string().optional(),
    boardId: z.string().optional(),
    subjectId: required('subject'),
    levelId: required('level'),
    status: z.enum(['DRAFT', 'PUBLISHED']),
  })
  .superRefine((value, ctx) => {
    if (value.requiresBoard && !value.boardId) ctx.addIssue({ code: 'custom', path: ['boardId'], message: 'Choose a board or stream' });
  })
  .transform(({ requiresBoard, ...value }) => ({
    ...value,
    subsectionNodeId: value.subsectionNodeId || undefined,
    // A board is sent only where the category requires one; the API rejects it otherwise
    boardId: requiresBoard ? value.boardId : undefined,
  }));
export type AddPathValues = z.input<typeof addPathSchema>;

export const editNodeSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(200, 'Use at most 200 characters'),
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a slug')
    .max(64, 'Use at most 64 characters')
    .regex(/^[a-z][a-z0-9_-]*$/, 'Use lowercase letters, digits, "-" or "_", starting with a letter'),
  sortOrder: z.coerce.number({ error: 'Enter a whole number' }).int('Enter a whole number').min(0, 'Use 0 or more').max(100000),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  bookingEnabled: z.boolean(),
});
export type EditNodeValues = z.input<typeof editNodeSchema>;

/** Only fields that changed are sent; name and slug only where the node owns them. */
export function editChanges(
  before: { name: string; slug: string; sortOrder: number; status: string; bookingEnabled: boolean },
  after: z.output<typeof editNodeSchema>,
  options: { ownsName: boolean; isCategory: boolean },
) {
  const changes: Partial<z.output<typeof editNodeSchema>> = {};
  if (options.ownsName && after.name !== before.name) changes.name = after.name;
  if (options.ownsName && after.slug !== before.slug) changes.slug = after.slug;
  if (after.sortOrder !== before.sortOrder) changes.sortOrder = after.sortOrder;
  if (after.status !== before.status) changes.status = after.status;
  if (options.isCategory && after.bookingEnabled !== before.bookingEnabled) changes.bookingEnabled = after.bookingEnabled;
  return changes;
}

export const fieldErrors = (error: z.ZodError) =>
  Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message])) as Record<string, string>;
