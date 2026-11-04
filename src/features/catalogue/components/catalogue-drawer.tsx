"use client";
import { useId, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button, Checkbox, ConfirmDialog, Drawer, Form, FormError, Label, SelectField, SubmitButton, TextField, Typography } from '@/components/ui';
import { useAddCataloguePath, useBoards, useLevels, useSubjects, useUpdateNode, type Category, type NodeDetail, type TreeNode } from '@/lib/api/catalogue';
import { ancestorsOf, subsectionsOf, typeLabel } from '@/lib/api/catalogue-tree';
import { describeApiError } from '@/lib/api/errors';
import { addPathSchema, editChanges, editNodeSchema, fieldErrors, type AddPathValues, type EditNodeValues } from '../schemas/catalogue';

export type DrawerState =
  | { mode: 'add'; prefill?: Partial<Pick<AddPathValues, 'categoryId' | 'subsectionNodeId' | 'boardId' | 'subjectId'>> }
  | { mode: 'edit'; node: TreeNode };

/**
 * One drawer, two modes (LMS-56 / screen 28a). "Add" creates a whole path from existing
 * master values; "Edit" changes one node. Closing with unsaved edits asks first.
 */
export function CatalogueDrawer({ tenant, state, roots, categories, onClose, onCreated }: {
  tenant: string;
  state: DrawerState;
  roots: readonly TreeNode[];
  categories: readonly Category[];
  onClose: () => void;
  onCreated: (leaf: NodeDetail) => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const formId = useId();
  const requestClose = () => (dirty ? setConfirming(true) : onClose());
  const title = state.mode === 'add' ? 'Add category' : `Edit ${typeLabel(state.node.type).toLowerCase()}`;
  return <>
    <Drawer open onClose={requestClose} title={title} footer={<>
      <Button onClick={requestClose}>Cancel</Button>
      <SubmitButton form={formId}>{state.mode === 'add' ? 'Add Category' : 'Save changes'}</SubmitButton>
    </>}>
      {state.mode === 'add'
        ? <AddPathForm formId={formId} tenant={tenant} prefill={state.prefill} roots={roots} categories={categories} onDirty={setDirty}
            onDone={(leaf) => { onCreated(leaf); onClose(); }} />
        : <EditNodeForm formId={formId} tenant={tenant} node={state.node} roots={roots} onDirty={setDirty} onDone={onClose} />}
    </Drawer>
    {confirming && <ConfirmDialog title="Discard changes?" confirmLabel="Discard" cancelLabel="Keep editing" destructive
      onCancel={() => setConfirming(false)} onConfirm={() => { setConfirming(false); onClose(); }}>
      <Typography>Your changes in this drawer have not been saved.</Typography>
    </ConfirmDialog>}
  </>;
}

const order = ['categoryId', 'subsectionNodeId', 'boardId', 'subjectId', 'levelId'] as const;
type CascadeKey = (typeof order)[number];

function AddPathForm({ formId, tenant, prefill, roots, categories, onDirty, onDone }: {
  formId: string; tenant: string; prefill?: Partial<Record<CascadeKey, string>>; roots: readonly TreeNode[];
  categories: readonly Category[]; onDirty: (dirty: boolean) => void; onDone: (leaf: NodeDetail) => void;
}) {
  const [values, setValues] = useState<Record<CascadeKey, string>>(() => Object.fromEntries(order.map((k) => [k, prefill?.[k] ?? ''])) as Record<CascadeKey, string>);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const category = categories.find((c) => c.id === values.categoryId);
  const root = roots.find((r) => r.categoryId === values.categoryId);
  const subsections = subsectionsOf(root);
  const boards = useBoards(tenant, Boolean(category?.requiresBoard));
  const subjects = useSubjects(tenant);
  const levels = useLevels(tenant, values.categoryId || undefined);
  const add = useAddCataloguePath(tenant);

  // Changing an earlier choice clears every later one
  const choose = (key: CascadeKey, value: string) => {
    const next = { ...values, [key]: value };
    for (const later of order.slice(order.indexOf(key) + 1)) next[later] = '';
    setValues(next);
    setErrors({});
    setFormError(undefined);
    onDirty(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = addPathSchema.safeParse({ ...values, requiresBoard: Boolean(category?.requiresBoard), status });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    try {
      const result = await add.mutateAsync(parsed.data);
      toast.success(`Added ${[...result.leaf.path.map((p) => p.name), result.leaf.name].join(' › ')}`);
      onDirty(false);
      onDone(result.leaf);
    } catch (error) {
      const described = describeApiError(error, 'add to the catalogue');
      setErrors(described.fields);
      setFormError(described.message);
    }
  };

  const select = (key: CascadeKey, label: string, options: { id: string; name: string }[] | undefined, extra: { disabled?: boolean; description?: string; required?: boolean } = {}) =>
    <SelectField label={label} value={values[key]} onChange={(e) => choose(key, e.target.value)} error={errors[key]} required={extra.required ?? true}
      disabled={extra.disabled || !options} description={extra.description}>
      <option value="">{options || extra.disabled ? `Select ${label.toLowerCase()}` : 'Loading…'}</option>
      {options?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </SelectField>;

  return <Form id={formId} onSubmit={submit} pending={add.isPending} noValidate>
    <Typography variant="body2" tone="muted">Adds a whole path, ending in a level, by choosing existing values. Missing intermediate nodes are created.</Typography>
    {select('categoryId', 'Category', categories.map((c) => ({ id: c.id, name: c.name })))}
    {subsections.length > 0 && select('subsectionNodeId', 'Subsection', subsections.map((s) => ({ id: s.id, name: s.name })), { required: false, description: 'Optional. Leave empty to add directly under the category.' })}
    {category?.requiresBoard && select('boardId', 'Board / Stream', boards.data)}
    {select('subjectId', 'Subject', subjects.data, { disabled: !values.categoryId })}
    {select('levelId', 'Level', levels.data, { disabled: !values.subjectId })}
    <SelectField label="Status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); onDirty(true); }}
      description="Draft paths are hidden from students until published.">
      <option value="DRAFT">Draft</option>
      <option value="PUBLISHED">Published</option>
    </SelectField>
    <FormError message={formError} />
  </Form>;
}

const ownsName = (node: TreeNode) => node.type === 'CATEGORY' || node.type === 'SUBSECTION';

function EditNodeForm({ formId, tenant, node, roots, onDirty, onDone }: {
  formId: string; tenant: string; node: TreeNode; roots: readonly TreeNode[]; onDirty: (dirty: boolean) => void; onDone: () => void;
}) {
  const initial = useMemo<EditNodeValues>(() => ({
    name: node.name, slug: node.slug, sortOrder: String(node.sortOrder),
    status: node.status === 'ARCHIVED' ? 'DRAFT' : node.status, bookingEnabled: node.bookingEnabled,
  }), [node]);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const update = useUpdateNode(tenant);
  const parentPath = ancestorsOf(roots, node.id).map((a) => a.name).join(' › ');
  const editable = ownsName(node);

  const change = <K extends keyof EditNodeValues>(key: K, value: EditNodeValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
    onDirty(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = editNodeSchema.safeParse(values);
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    const before = { ...node, status: node.status === 'ARCHIVED' ? 'ARCHIVED' : node.status };
    const changes = editChanges(before, parsed.data, { ownsName: editable, isCategory: node.type === 'CATEGORY' });
    if (Object.keys(changes).length === 0) { onDirty(false); onDone(); return; }
    try {
      await update.mutateAsync({ id: node.id, ...changes });
      toast.success(`Saved ${parsed.data.name}`);
      onDirty(false);
      onDone();
    } catch (error) {
      const described = describeApiError(error, 'edit the catalogue');
      setErrors(described.fields);
      setFormError(described.message);
    }
  };

  return <Form id={formId} onSubmit={submit} pending={update.isPending} noValidate>
    <TextField label="Parent" value={parentPath || 'None (category)'} readOnly />
    <TextField label="Name" value={values.name} onChange={(e) => change('name', e.target.value)} error={errors.name} required
      readOnly={!editable} description={editable ? undefined : 'Managed in master data'} />
    <TextField label="Slug" value={values.slug} onChange={(e) => change('slug', e.target.value)} error={errors.slug} required
      readOnly={!editable} description={editable ? 'Lowercase letters, digits, "-" or "_".' : 'Managed in master data'} />
    <TextField label="Sort order" type="number" min={0} step={1} value={String(values.sortOrder)}
      onChange={(e) => change('sortOrder', e.target.value)} error={errors.sortOrder} />
    <SelectField label="Status" value={values.status} onChange={(e) => change('status', e.target.value as 'DRAFT' | 'PUBLISHED')} error={errors.status}
      description={node.status === 'ARCHIVED' ? 'This node is archived. Saving a status restores it.' : 'Archive is a separate action.'}>
      <option value="DRAFT">Draft</option>
      <option value="PUBLISHED">Published</option>
    </SelectField>
    {node.type === 'CATEGORY' && <Label className="flex items-center gap-2">
      <Checkbox checked={values.bookingEnabled} onChange={(e) => change('bookingEnabled', e.target.checked)} />
      Students can book sessions in this category
    </Label>}
    <FormError message={formError} />
  </Form>;
}
