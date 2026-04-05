import { cookies } from "next/headers";

export type SessionUser = {
  id: number;
  username: string;
  role: string;
  status: string;
};

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(`${BACKEND_INTERNAL_URL}/api/v1/auth/me`, {
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<SessionUser> | SessionUser;
    return typeof payload === "object" && payload !== null && "data" in payload ? payload.data : payload;
  } catch {
    return null;
  }
}