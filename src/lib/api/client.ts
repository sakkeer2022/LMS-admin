"use client";
import { ApiError, type ApiEnvelope } from "./contracts";
import { hasDevAdminSession } from '@/lib/auth/dev-admin';
const base = "/api/v1";
let csrf: Promise<string> | undefined;
let refreshing: Promise<void> | undefined;
// Cookies are HttpOnly. No token storage in localStorage or JavaScript.
async function csrfToken() {
  return (csrf ??= fetch(`${base}/auth/csrf-token`, {
    credentials: "same-origin",
    cache: "no-store",
  })
    .then(async (r) => {
      const body = await r.json();
      if (!r.ok || !body.success)
        throw new ApiError(r.status, "Unable to initialize CSRF protection");
      return body.data.csrfToken as string;
    })
    .catch((error) => {
      csrf = undefined;
      throw error;
    }));
}
async function rotate() {
  const response = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "x-csrf-token": await csrfToken() },
  });
  if (!response.ok)
    throw new ApiError(401, "Your session has expired. Please sign in again.");
}
async function sharedRefresh() {
  // Web Locks also serialize refresh across tabs: recheck after acquiring the lock.
  const work = async () => {
    const probe = await fetch(`${base}/auth/me`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (probe.status === 401) await rotate();
    else if (!probe.ok)
      throw new ApiError(probe.status, "Session verification unavailable");
  };
  return (refreshing ??= (async () => {
    if (typeof navigator !== "undefined" && navigator.locks)
      await navigator.locks.request("session-refresh", work);
    else await work();
  })().finally(() => {
    refreshing = undefined;
  }));
}
export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<Extract<ApiEnvelope<T>, { success: true }>> {
  if (hasDevAdminSession()) throw new ApiError(403, 'Development session: live data is unavailable. Sign out and use a real account to access backend data.');
  if (!/^\/[a-z0-9][a-z0-9/_?=&%.:-]*$/i.test(path) || path.includes(".."))
    throw new Error("Invalid API path");
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("content-type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(init.method?.toUpperCase() ?? "GET"))
    headers.set("x-csrf-token", await csrfToken());
  const send = () =>
    fetch(`${base}${path}`, {
      ...init,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  let response = await send();
  if (
    response.status === 401 &&
    !/^\/auth\/(login|register|refresh|logout)/.test(path)
  ) {
    await sharedRefresh();
    response = await send();
  }
  if (response.status === 204)
    return { success: true, message: "Success", data: null as T };
  let body: ApiEnvelope<T>;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "The service returned an invalid response",
    );
  }
  if (!response.ok || !body.success)
    throw new ApiError(
      response.status,
      body.message,
      !body.success ? body.errors : undefined,
      !body.success ? body.traceId : undefined,
    );
  return body;
}
