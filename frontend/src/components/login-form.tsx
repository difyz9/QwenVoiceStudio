"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/backend/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "登录失败，请检查用户名和密码。");
      }

      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "登录失败，请稍后重试。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <div className="mb-2 text-sm font-medium text-slate-700">用户名</div>
        <input
          className="control-field"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
        />
      </label>

      <label className="block">
        <div className="mb-2 text-sm font-medium text-slate-700">密码</div>
        <input
          className="control-field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </label>

      {error ? <div className="rounded-[1.35rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <button
        type="submit"
        disabled={isPending}
        className="action-button action-button-primary flex w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "登录中..." : "进入管理后台"}
      </button>
    </form>
  );
}