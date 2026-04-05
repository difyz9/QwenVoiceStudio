"use client";

export class BackendRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BackendRequestError";
    this.status = status;
  }
}

let endSessionPromise: Promise<void> | null = null;

export async function endSession() {
  if (!endSessionPromise) {
    endSessionPromise = fetch("/api/session/logout", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
    })
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        endSessionPromise = null;
      });
  }

  await endSessionPromise;
}

export async function fetchBackendJson<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    await endSession();
    window.location.replace("/login?reason=session-expired");
    throw new BackendRequestError("登录状态已失效，请重新登录。", 401);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new BackendRequestError(payload?.detail ?? "请求失败，请稍后重试。", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}