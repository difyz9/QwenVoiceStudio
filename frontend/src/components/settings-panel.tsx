"use client";

import { startTransition, useEffect, useState } from "react";

import { fetchBackendJson } from "@/lib/backend-client";

type SummaryPayload = {
  appName: string;
  currentUser: string;
  presetCount: number;
  runtime: string;
  defaultAdmin: string;
};

type HealthPayload = {
  status: string;
  service: string;
};

export function SettingsPanel() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [summaryPayload, healthPayload] = await Promise.all([
          fetchBackendJson<SummaryPayload>("/api/backend/v1/system/summary"),
          fetchBackendJson<HealthPayload>("/api/backend/v1/system/health"),
        ]);

        if (!cancelled) {
          startTransition(() => {
            setSummary(summaryPayload);
            setHealth(healthPayload);
            setError(null);
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "系统信息加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const items = [
    { label: "服务名称", value: health?.service ?? summary?.appName ?? "--" },
    { label: "健康状态", value: health?.status ?? "--" },
    { label: "当前用户", value: summary?.currentUser ?? "--" },
    { label: "运行环境", value: summary?.runtime ?? "--" },
    { label: "预置音色数", value: summary ? String(summary.presetCount) : "--" },
    { label: "默认管理员", value: summary?.defaultAdmin ?? "--" },
  ];

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <div className="rounded-[32px] border border-border bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">System Snapshot</div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-panel-strong">运行时信息</h2>

        {error ? <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {isLoading ? <div className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">正在同步系统信息...</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.label} className="rounded-[28px] border border-border bg-[#fffcf7] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
              <div className="mt-3 text-xl font-semibold tracking-tight text-panel-strong">{item.value}</div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-[32px] border border-border bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Ops Notes</div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-panel-strong">当前可操作项</h2>
        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
          <div className="rounded-[28px] bg-[#fffcf7] px-5 py-5">
            如果页面出现 401 或 Invalid token，前端现在会自动清理会话并跳回登录页，不再停留在失效 cookie 状态。
          </div>
          <div className="rounded-[28px] bg-[#f7f2e8] px-5 py-5">
            退出登录已经改成显式 session 清理流程，会同时清掉前端同域 cookie，并尝试通知后端注销。
          </div>
          <div className="rounded-[28px] bg-[#eef3ea] px-5 py-5">
            设置页目前提供的是运行态检查，不会修改服务端配置。等后端开放设置接口后，这里可以继续扩展保存动作。
          </div>
        </div>
      </div>
    </section>
  );
}