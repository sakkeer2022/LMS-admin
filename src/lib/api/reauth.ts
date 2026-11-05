import { ApiError } from "./contracts";

/** The message the backend sends with a 403 when a sensitive action needs a freshly confirmed password. */
export const REAUTH_REQUIRED_MESSAGE = "Recent re-authentication required";

export function isReauthRequired(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.message === REAUTH_REQUIRED_MESSAGE
  );
}
