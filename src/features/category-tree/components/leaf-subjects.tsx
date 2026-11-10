"use client";
import { useState, type FormEvent } from 'react';
import { TextField } from '@/components/forms/field';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Switch } from '@/components/shadcn/switch';
import { describeApiError } from '@/lib/api/errors';
import {
  useAttachSubject, useDetachSubject, useLeafSubjects, useLookup, useSetLeafSubjectActive, type LeafSubject,
} from '@/lib/api/category-tree';

const usage = (s: LeafSubject) => [
  s.tutors && `${s.tutors} ${s.tutors === 1 ? 'tutor' : 'tutors'}`,
  s.prices && `${s.prices} ${s.prices === 1 ? 'price' : 'prices'}`,
  s.learners && `${s.learners} ${s.learners === 1 ? 'learner' : 'learners'}`,
].filter(Boolean).join(' · ');

/**
 * The subjects a leaf offers: tutors pick one, the admin prices it, students choose it.
 * A subject is added by name (an existing subject is reused) and can be switched off or,
 * while nothing uses it, removed. The server enforces both rules.
 */
export function LeafSubjects({ categoryId, canManage }: { categoryId: string; canManage: boolean }) {
  const subjects = useLeafSubjects(categoryId);
  const lookup = useLookup('subjects', canManage);
  const attach = useAttachSubject();
  const toggle = useSetLeafSubjectActive();
  const detach = useDetachSubject();
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const trimmed = name.trim();
  const busy = attach.isPending || toggle.isPending || detach.isPending;
  const fail = (err: unknown) => setError(describeApiError(err, 'change the subjects').message);

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || busy) return;
    setError(undefined);
    const existing = lookup.data?.find((s) => s.isActive && s.name.toLowerCase() === trimmed.toLowerCase());
    attach.mutate({ categoryId, ...(existing ? { subjectId: existing.id } : { name: trimmed }) }, {
      onSuccess: () => setName(''),
      onError: fail,
    });
  };

  return <div className="flex flex-col gap-3 border-t p-5">
    <div className="flex flex-col gap-0.5">
      <h3 className="text-sm font-semibold">Subjects</h3>
      <p className="text-xs text-muted-foreground">Tutors pick from these, and you set a price for each.</p>
    </div>

    {subjects.isPending ? <Skeleton className="h-12 w-full" aria-label="Loading" />
      : subjects.isError ? <p className="text-sm text-error-foreground" role="alert">The subjects could not be loaded. {describeApiError(subjects.error, 'view the catalogue').message}</p>
      : subjects.data.length === 0 ? <p className="text-sm text-muted-foreground">No subjects yet. Tutors can&apos;t pick this category until you add one.</p>
      : <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {subjects.data.map((s) => {
            const inUse = s.tutors + s.prices + s.learners > 0;
            return <li key={s.curriculumId} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium break-words">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {usage(s) || 'Not used yet'}
                  {!s.subjectActive && <> · <Badge variant="warning">Off everywhere</Badge></>}
                </span>
              </div>
              {canManage && <div className="flex shrink-0 items-center gap-2">
                <Switch checked={s.isActive} disabled={busy} aria-label={`${s.isActive ? 'Turn off' : 'Turn on'} ${s.name}`}
                  onCheckedChange={(isActive) => { setError(undefined); toggle.mutate({ categoryId, subjectId: s.subjectId, isActive }, { onError: fail }); }} />
                <Button size="sm" variant="ghost" disabled={busy || inUse} className="text-warning-foreground"
                  title={inUse ? 'In use. Turn it off instead.' : undefined}
                  onClick={() => { setError(undefined); detach.mutate({ categoryId, subjectId: s.subjectId }, { onError: fail }); }}>
                  Remove
                </Button>
              </div>}
            </li>;
          })}
        </ul>}

    {canManage && <form onSubmit={add} className="flex items-end gap-2">
      <TextField containerClassName="min-w-0 flex-1" label="Add a subject" maxLength={100} value={name} list="subject-names"
        onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" />
      <datalist id="subject-names">
        {lookup.data?.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.name} />)}
      </datalist>
      <Button type="submit" size="sm" variant="outline" disabled={busy || !trimmed}>Add</Button>
    </form>}
    {error && <p className="text-xs text-error-foreground" role="alert">{error}</p>}
  </div>;
}
