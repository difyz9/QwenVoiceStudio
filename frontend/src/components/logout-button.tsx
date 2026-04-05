"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { endSession } from "@/lib/backend-client";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setIsPending(true);
    setError(null);

    try {
      await endSession();
      router.replace("/login");
      router.refresh();
      window.location.assign("/login");
    } catch {
      setError("退出失败，请稍后重试。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleLogout}
        className="rounded-2xl bg-panel-strong px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={isPending}
      >
        {isPending ? "退出中..." : "退出登录"}
      </button>
      {error ? <div className="text-xs text-rose-600">{error}</div> : null}
    </div>
  );
}