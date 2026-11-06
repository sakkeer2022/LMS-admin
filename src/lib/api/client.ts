"use client";
import { ApiError, type ApiEnvelope } from "./contracts";
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
/** Query string for api() paths: spaces as %20, since api() rejects "+" and other raw characters. */
export function queryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, value);
  return search.toString().replace(/\+/g, '%20');
}
export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<Extract<ApiEnvelope<T>, { success: true }>> {
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
    !/^\/auth\/([a-z]+\/login|refresh|logout|recovery)/.test(path)
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
      !body.success ? body.code : undefined,
    );
  return body;
}

/**
 * GET a file (a PDF, for example) as a Blob. Same CSRF-free GET, one refresh and retry on 401 as `api`; an
 * error response is read as the usual JSON envelope and thrown as an ApiError.
 */
export async function apiBlob(
  path: string,
  init: RequestInit = {},
): Promise<Blob> {
  if (!/^\/[a-z0-9][a-z0-9/_?=&%.:-]*$/i.test(path) || path.includes(".."))
    throw new Error("Invalid API path");
  const send = () =>
    fetch(`${base}${path}`, {
      ...init,
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
  let response = await send();
  if (response.status === 401) {
    await sharedRefresh();
    response = await send();
  }
  if (!response.ok) {
    let message = "The file could not be downloaded";
    let traceId: string | undefined;
    try {
      const body = (await response.json()) as ApiEnvelope<never>;
      message = body.message ?? message;
      traceId = !body.success ? body.traceId : undefined;
    } catch {
      // keep the generic message
    }
    throw new ApiError(response.status, message, undefined, traceId);
  }
  return response.blob();
}
