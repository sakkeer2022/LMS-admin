"use client";
import { useState } from 'react';
import { ConfirmDialog } from '@/components/forms/confirm-dialog';
import { CheckField, TextField } from '@/components/forms/field';
import { Button } from '@/components/shadcn/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/shadcn/sheet';
import { describeApiError } from '@/lib/api/errors';
import {
  useCategoryDetail, useCreateCategory, useDeleteCategory, useLookup, useSaveLeafSettings, useUpdateCategory,
  type CategoryNode,
} from '@/lib/api/category-tree';
import { CODE_PATTERN, codeFromName } from '@/lib/api/category-tree-model';
import { Rows } from './category-detail-panel';

export type FormState = { mode: 'create'; parent: CategoryNode | null } | { mode: 'edit'; node: CategoryNode };

/**
 * Add a root or sub-category, or edit one: name and code, and for a category without
 * sub-categories its booking settings (bookable, requires board/level, allowed levels).
 */
export function CategoryFormDialog({ state, nodes, onClose, onSaved }: {
  state: FormState;
  nodes: readonly CategoryNode[];
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const editing = state.mode === 'edit' ? state.node : undefined;
  const detail = useCategoryDetail(editing?.id);
  const isLeaf = editing ? editing.childrenCount === 0 : false;
  const levels = useLookup('levels', isLeaf);
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const settings = useSaveLeafSettings();

  const [name, setName] = useState(editing?.name ?? '');
  const [code, setCode] = useState(editing?.code ?? '');
  const [codeTouched, setCodeTouched] = useState(Boolean(editing));
  const [leaf, setLeaf] = useState<{ isBookable: boolean; requiresBoard: boolean; requiresLevel: boolean; levelIds: string[] } | null>(null);
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Record<string, string>>({});

  // Leaf settings start from the server's values once the detail has loaded
  const current = leaf ?? (detail.data ? {
    isBookable: detail.data.isBookable, requiresBoard: detail.data.requiresBoard, requiresLevel: detail.data.requiresLevel,
    levelIds: detail.data.allowedLevels.map((l) => l.id),
  } : null);
  const effectiveCode = codeTouched ? code : codeFromName(name);
  const parent = state.mode === 'create' ? state.parent : null;
  const siblingClash = nodes.some((n) => n.parentId === (state.mode === 'create' ? parent?.id ?? null : editing!.parentId) && n.code === effectiveCode && n.id !== editing?.id);
  const codeError = !effectiveCode ? 'Enter a code' : !CODE_PATTERN.test(effectiveCode) ? 'Use lowercase letters, digits, "-" or "_", starting with a letter'
    : siblingClash ? 'Another category at this level already uses this code' : fields.code;
  const levelsError = current?.isBookable && current.requiresLevel && current.levelIds.length === 0 ? 'Choose at least one level, or turn off "Requires level"' : undefined;
  const pending = create.isPending || update.isPending || settings.isPending;

  const title = state.mode === 'edit' ? `Edit ${state.node.name}` : parent ? `Add sub-category to ${parent.name}` : 'Add root category';

  const save = async () => {
    setError(undefined);
    setFields({});
    try {
      if (state.mode === 'create') {
        const created = await create.mutateAsync({ parentId: parent?.id ?? null, code: effectiveCode, name: name.trim() });
        onSaved(created.id);
        return;
      }
      const node = detail.data ?? state.node;
      let version = node.version;
      if (name.trim() !== node.name || effectiveCode !== node.code) {
        version = (await update.mutateAsync({ id: node.id, version, name: name.trim(), code: effectiveCode })).version;
      }
      if (isLeaf && current && leaf) {
        await settings.mutateAsync({ id: node.id, version, ...current });
      }
      onSaved(node.id);
    } catch (err) {
      const described = describeApiError(err, 'change the catalogue');
      setError(described.message);
      setFields(described.fields);
    }
  };

  const toggleLevel = (id: string, on: boolean) => current &&
    setLeaf({ ...current, levelIds: on ? [...current.levelIds, id] : current.levelIds.filter((l) => l !== id) });

  return <Sheet open onOpenChange={(open) => !open && !pending && onClose()}>
   <SheetContent className="w-full overflow-y-auto sm:max-w-md">
    <SheetHeader className="border-b"><SheetTitle>{title}</SheetTitle></SheetHeader>
    <div className="flex flex-col gap-4 px-4">
      {parent && <p className="text-xs text-muted-foreground">Path: {parent.path}/{effectiveCode || '…'}</p>}
      <TextField label="Name" required maxLength={100} value={name} error={fields.name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Code" required maxLength={50} value={effectiveCode} error={name || codeTouched ? codeError : undefined}
        hint="Used in the category path. Unique among its siblings. Changing it updates the path of everything below it."
        onChange={(e) => { setCodeTouched(true); setCode(e.target.value.trim()); }} />

      {editing && !isLeaf && <p className="text-sm text-muted-foreground">
        {editing.name} has sub-categories, so it cannot be bookable. Booking settings belong to the categories at the end of a branch.
      </p>}

      {editing && isLeaf && (!current ? <Rows count={3} /> : <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold">Booking</legend>
        <CheckField label="Bookable by learners" checked={current.isBookable} onCheckedChange={(v) => setLeaf({ ...current, isBookable: v === true })} />
        <CheckField label="Requires a board" checked={current.requiresBoard} onCheckedChange={(v) => setLeaf({ ...current, requiresBoard: v === true })} />
        <CheckField label="Requires a level" checked={current.requiresLevel} onCheckedChange={(v) => setLeaf({ ...current, requiresLevel: v === true })} />
        {current.requiresLevel && <div className="flex flex-col gap-2" role="group" aria-labelledby="allowed-levels-label">
          <p id="allowed-levels-label" className="text-sm">Allowed levels ({current.levelIds.length} selected)</p>
          {levels.isPending ? <Rows count={2} /> : <div className="grid max-h-56 grid-cols-2 gap-1 overflow-auto">
            {levels.data?.map((l) => <CheckField key={l.id} label={`${l.name}${l.isActive ? '' : ' (inactive)'}`} checked={current.levelIds.includes(l.id)}
              disabled={!l.isActive && !current.levelIds.includes(l.id)} onCheckedChange={(v) => toggleLevel(l.id, v === true)} />)}
          </div>}
          {levelsError && <p className="text-xs text-error-foreground">{levelsError}</p>}
        </div>}
      </fieldset>)}

      {error && <p className="text-sm text-error-foreground" role="alert">{error}</p>}
    </div>
    <SheetFooter className="flex-row justify-end border-t">
      <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
      <Button disabled={pending || !name.trim() || Boolean(codeError) || Boolean(levelsError) || Boolean(editing && !detail.data)} onClick={() => void save()}>
        {pending ? 'Saving…' : state.mode === 'edit' ? 'Save changes' : 'Add category'}
      </Button>
    </SheetFooter>
   </SheetContent>
  </Sheet>;
}

/** Hard delete. The server refuses while anything depends on the category and says why. */
export function DeleteCategoryDialog({ node, onClose, onDeleted }: {
  node: CategoryNode;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const remove = useDeleteCategory();
  const update = useUpdateCategory();
  const [blocked, setBlocked] = useState<string>();
  const [error, setError] = useState<string>();
  const knownBlock = node.childrenCount > 0 || node.curriculaCount > 0;

  if (blocked || knownBlock) {
    const reason = blocked ?? `${node.name} cannot be deleted because it has ${[node.childrenCount && `${node.childrenCount} sub-categor${node.childrenCount === 1 ? 'y' : 'ies'}`, node.curriculaCount && `${node.curriculaCount} curricul${node.curriculaCount === 1 ? 'um' : 'a'}`].filter(Boolean).join(' and ')}. Deactivate it instead.`;
    return <ConfirmDialog open title={`Delete ${node.name}`} confirmLabel={node.isActive ? 'Deactivate instead' : 'Close'} pending={update.isPending} onCancel={onClose}
      onConfirm={() => {
        if (!node.isActive) { onClose(); return; }
        update.mutate({ id: node.id, version: node.version, isActive: false }, {
          onSuccess: onClose,
          onError: (err) => setError(describeApiError(err, 'change the status').message),
        });
      }}>
      <p className="text-sm" role="alert">{reason}</p>
      {node.isActive && <p className="text-sm text-muted-foreground">Deactivating hides it and everything below it from learners. Nothing is lost.</p>}
      {error && <p className="text-sm text-error-foreground">{error}</p>}
    </ConfirmDialog>;
  }

  return <ConfirmDialog open title={`Delete ${node.name}`} confirmLabel="Delete" destructive pending={remove.isPending} onCancel={onClose}
    onConfirm={() => remove.mutate({ id: node.id, version: node.version }, {
      onSuccess: onDeleted,
      onError: (err) => {
        const described = describeApiError(err, 'delete categories');
        if (described.code === 'DELETE_BLOCKED') setBlocked(described.message);
        else setError(described.message);
      },
    })}>
    <p className="text-sm">Delete {node.name} ({node.path}) permanently? This cannot be undone.</p>
    {error && <p className="text-sm text-error-foreground" role="alert">{error}</p>}
  </ConfirmDialog>;
}
