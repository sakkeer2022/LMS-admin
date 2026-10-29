import { ApiError } from './contracts';

export type ApiErrorKind = 'forbidden' | 'not-found' | 'conflict' | 'stale' | 'validation' | 'unavailable' | 'other';

export interface DescribedError {
  kind: ApiErrorKind;
  message: string;
  /** First message per field, keyed as the backend reports it (e.g. "boardId", "changes[2]"). */
  fields: Record<string, string>;
}

// The backend error body has no machine-readable code yet, so a stale revision is told
// apart from other 409s by its message (pricing.service.ts STALE_REVISION).
const STALE = /changed by someone else/i;

/** Turns any thrown error into a readable message plus field errors for forms. */
export function describeApiError(error: unknown, action = 'do this'): DescribedError {
  if (!(error instanceof ApiError)) {
    return { kind: 'other', message: error instanceof Error ? error.message : 'Something went wrong', fields: {} };
  }
  const fields: Record<string, string> = {};
  for (const [key, messages] of Object.entries(error.fields ?? {})) if (messages[0]) fields[key] = messages[0];
  switch (true) {
    case error.status === 403:
      return { kind: 'forbidden', message: `You don't have permission to ${action}.`, fields };
    case error.status === 404:
      return { kind: 'not-found', message: error.message || 'It no longer exists.', fields };
    case error.status === 409 && STALE.test(error.message):
      return { kind: 'stale', message: 'Someone else changed this; reload to see the latest values.', fields };
    case error.status === 409:
      return { kind: 'conflict', message: error.message, fields };
    case error.status === 400 || error.status === 422:
      return { kind: 'validation', message: Object.keys(fields).length ? 'Check the highlighted fields.' : error.message, fields };
    case error.status >= 500:
      return { kind: 'unavailable', message: `Service unavailable${error.traceId ? ` · Reference ${error.traceId}` : ''}`, fields };
    default:
      return { kind: 'other', message: error.message, fields };
  }
}
